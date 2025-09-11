import { writeFile, writeFileSync } from "fs";
import { compile } from "json-schema-to-typescript";
import { resolve } from "path";
import {
  cachedFetch,
  customizeK8sSchema,
  schemaToTsConfig,
  extendK8sInterface,
  toSafeString,
  compareApiVersions,
} from "./utils";
import { JSONSchema4 } from "json-schema";

const OPENSHIFT_K8S_SWAGGER =
  "https://raw.githubusercontent.com/openshift/kubernetes/refs/heads/master/api/openapi-spec/swagger.json";

interface K8sDefinition extends JSONSchema4 {
  "x-kubernetes-group-version-kind": {
    group: string;
    version: string;
    kind: string;
  }[];
}

export const generateKubernetesTypesFromSwagger = () => {
  // fetch swagger.json from OPENSHIFT_K8S_SWAGGER
  cachedFetch(OPENSHIFT_K8S_SWAGGER)
    .then((res) => res.json())
    .then((swagger) => {
      // find all definitions that are CustomResourceDefinitions
      const definitions = swagger.definitions as JSONSchema4;

      // filter definitions that have 'x-kubernetes-group-version-kind' property
      // these are the resources we want to generate types for
      const crdDefinitions: Record<string, K8sDefinition> = {};

      for (const [name, def] of Object.entries(definitions)) {
        if (def["x-kubernetes-group-version-kind"]) {
          crdDefinitions[name] = def;
        }
      }

      // generate types for each CRD definition
      const compilePromises: Promise<{
        baseName: string;
        filePath: string;
        interfaceName: string;
        kind: string;
        version: string;
      }>[] = [];

      const interfaces: Set<string> = new Set();

      for (const [name, def] of Object.entries(crdDefinitions)) {
        // Only generate types if there are properties defined
        if (!def.properties || Object.keys(def.properties).length === 0) {
          console.warn(`Skipping ${name}: no properties defined in schema.`);
          continue;
        }

        const { group, version, kind } =
          def["x-kubernetes-group-version-kind"][0];
        const baseName = `${version}${kind}`;
        const fileName = `${baseName}.d.ts`;
        const interfaceName = toSafeString(`${version}${kind}Kind`);

        // the parser may go through multiple versions of the same kind, but we only want one
        // this prevents multiple file writers from writing to the same file
        if (interfaces.has(interfaceName)) {
          console.warn(
            `Skipping ${name}: interface ${interfaceName} already exists.`,
          );
          continue;
        }
        interfaces.add(interfaceName);

        const filePath = resolve(
          __dirname,
          `../generated/types/kubernetes/${fileName}`,
        );

        // Clone the definition to avoid modifying the original
        const modifiedDef: K8sDefinition = JSON.parse(JSON.stringify(def));

        // Create a schema with the modified definition and all the referenced definitions
        const schema: JSONSchema4 = {
          definitions: swagger.definitions,
          ...modifiedDef,
        };

        customizeK8sSchema(schema, group, version, kind);

        const compilePromise = compile(schema, interfaceName, schemaToTsConfig)
          .then((ts) => {
            return new Promise<{
              baseName: string;
              filePath: string;
              interfaceName: string;
              version: string;
              kind: string;
            }>((resolve, reject) => {
              writeFile(
                filePath,
                extendK8sInterface(ts, schema, interfaceName),
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      baseName,
                      filePath,
                      interfaceName,
                      version,
                      kind,
                    });
                  }
                },
              );
            });
          })
          .catch((err) => {
            console.error(`Error compiling schema for ${name}`, err);
            throw err;
          });

        compilePromises.push(compilePromise);
      }

      // wait for all compile promises to finish
      // then create an index file exporting all types
      Promise.all(compilePromises).then((results) => {
        const versions: Record<string, string[]> = {};

        results.filter(Boolean).map((i) => {
          if (!versions[i.baseName]) versions[i.baseName] = [];
          versions[i.baseName].push(i.version);
        });

        const acc: string[] = [];

        // the newest version of each baseName also get reexported without the version prefix
        for (const [kind, vers] of Object.entries(versions)) {
          const newest = vers.reduce((newest, current) => {
            return compareApiVersions(newest, current) >= 0 ? newest : current;
          }, vers[0]);
          acc.push(`export type { ${toSafeString(newest)}${kind}Kind as ${kind}Kind } from './${newest}${kind}';`);
          for (const ver of vers) {
            acc.push(`export type { ${toSafeString(ver)}Kind } from './${ver}${kind}';`);
          }
        }

        // create src/generated/kubernetes-crds.d.ts
        writeFileSync(
          resolve(__dirname, "../generated/types/kubernetes/index.d.ts"),
          `// This file is autogenerated from the corresponding Kubernetes resources.
// Do not edit this file directly.

${acc.join("\n")}

`,
        );
      });
    })
    .catch((err) => {
      console.error(
        "Error fetching or processing Kubernetes swagger.json",
        err,
      );
    });
};

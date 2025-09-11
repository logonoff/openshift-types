import { JSONSchema7 } from "json-schema";
import { K8sResourceCommon } from "./K8sResourceCommon";

/**
 * very simplified CRD type which assumes some fields are required.
 * unfortunately cannot use our own types here as they are not yet generated...
 */
export interface CustomResourceDefinitionKind extends K8sResourceCommon {
  metadata: {
    name: string;
  };
  spec: {
    group: string;
    names: {
      kind: string;
      listKind: string;
      plural: string;
      singular: string;
    };
    scope: string;
    versions: {
      name: string;
      additionalPrinterColumns: {
        jsonPath: string;
        name: string;
        type: string;
      }[];
      schema: {
        openAPIV3Schema: JSONSchema7;
      };
    }[];
  };
}

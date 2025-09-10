import { JSONSchema7 } from "json-schema";
import { K8sResourceCommon } from "./K8sResourceCommon";

/** LicenseObject
 *
 * https://spec.openapis.org/oas/v3.1.0#license-object
 */
export interface LicenseObject {
  name: string;
  identifier?: string;
  url?: string;
}

/** InfoObject
 *
 * https://spec.openapis.org/oas/v3.1.0#info-object
 */
export interface InfoObject {
  title: string;
  version: string;
  license?: LicenseObject;
  description?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
}

/** BasicSchemaTypes
 *
 * note: 'object' and 'array' will be handled differently
 * Data types:
 * https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-4.2.1
 */
type BasicSchemaTypes = 'null' | 'boolean' | 'number' | 'string' | 'integer' | 'date'; // note: date is not part of OpenAPI

/** SchemaFormats
 *
 * Formats:
 * https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#section-7.3
 * Dates:
 * https://datatracker.ietf.org/doc/html/rfc3339#section-5.6
 */
type SchemaFormats =
  | 'int32'
  | 'int64'
  | 'float'
  | 'double'
  | 'password'
  | 'date-time'
  | 'time'
  | 'date'
  | 'email'
  | 'email'
  | 'regex';

/** SchemaObject
 *
 * https://spec.openapis.org/oas/v3.1.0#schema-object
 */
export interface BasicSchemaObject {
  type: BasicSchemaTypes;
  description?: string;

  format?: SchemaFormats;
  enum?: unknown[]; // type is union of enums
  pattern?: string;
  default?: unknown;
}

export interface AdditionalPropertiesSchemaObject {
  type: string;
}

export interface ArraySchemaObject {
  type: 'array';
  description?: string;

  items: SchemaObject;
}

export interface ObjectSchemaObject {
  type: 'object';
  description?: string;

  additionalProperties?: AdditionalPropertiesSchemaObject | boolean;
  properties?: {
    [name: string]: SchemaObject;
  };
  required?: string[];
}

type SchemaObject = BasicSchemaObject | ArraySchemaObject | ObjectSchemaObject;

/** ComponentsObject
 *
 * https://spec.openapis.org/oas/v3.1.0#components-object
 */
export interface ComponentsObject {
  schemas?: {
    [id: string]: SchemaObject;
  };
}

/** OpenAPIObject
 *
 * https://spec.openapis.org/oas/v3.1.0#openapi-object
 */
export interface OpenAPIObject {
  openapi: string;
  info: InfoObject;
  components?: ComponentsObject;
}

/** TypeScript type field
 *
 * Describe a field in a type or export interface
 */
export interface TypeScriptTypeField {
  name: string;
  description?: string;
  type: string;
  isArray?: boolean;
  isObject: boolean;
  originalType?: string;
  format?: SchemaFormats;
  enum?: unknown[]; // type is union of enums
  pattern?: string;
  default?: unknown;
  required?: boolean;
  additionalProperties?: AdditionalPropertiesSchemaObject | boolean;
}

/** TypeScript type field
 *
 * Describe a type or export interface
 */
export interface TypeScriptType {
  parent: string;
  name: string;
  description?: string;
  fields: { [id: string]: TypeScriptTypeField };
  required?: string[];
}

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

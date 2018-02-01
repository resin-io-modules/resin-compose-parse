import * as fs from 'fs';

import * as ajv from 'ajv';
import TypedError = require('typed-error');

export class SchemaError extends TypedError {}

export enum SchemaVersion {
	v1_0 = '',
	v2_0 = '2',
	v2_1 = '2.1',
}

export const DEFAULT_SCHEMA_VERSION = SchemaVersion.v2_1;

const schemas: any = {};
schemas[SchemaVersion.v1_0] = 'v1';
schemas[SchemaVersion.v2_0] = 'v2.0';
schemas[SchemaVersion.v2_1] = 'v2.1';

function loadJSON(path: string): any {
	const filePath = require.resolve(path);
	const buf = fs.readFileSync(filePath);
	return JSON.parse(buf.toString('utf-8'));
}

function loadSchema(version: SchemaVersion): any {
	return loadJSON(`./config_schema_${schemas[version]}.json`);
}

export function validate(version: SchemaVersion, data: any): void {
	const schema = loadSchema(version);

	const validator = new ajv({
		allErrors: false,
		coerceTypes: true,
		jsonPointers: true,
		logger: false,
		schemaId: 'id',
		useDefaults: true,
	} as any); // cast to `any` required because ajv declarations omit `logger`.

	validator
		.addMetaSchema(loadJSON('ajv/lib/refs/json-schema-draft-04.json'))
		.addFormat('ports', validatePorts)
		.addFormat('expose', validateExpose)
		.addFormat('duration', validateDuration);

	if (!validator.validate(schema, data)) {
		throw new SchemaError(validator.errorsText());
	}
}

function validatePorts(_value: string | number): boolean {
	return true;
}

function validateExpose(value: string | number): boolean {
	return /^\d+(\-\d+)?(\/[a-zA-Z]+)?$/.test(`${value}`);
}

function validateDuration(value: string | number): boolean {
	if (typeof value === 'number') {
		return true;
	}

	const re = new RegExp(
		'^' +
		'(?:([\\d.]+)h)?' +
		'(?:([\\d.]+)m)?' +
		'(?:([\\d.]+)s)?' +
		'(?:([\\d.]+)ms)?' +
		'(?:([\\d.]+)us)?' +
		'(?:([\\d.]+)ns)?' +
		'$');

	return re.test(value);
}

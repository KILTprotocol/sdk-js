import {CTypeModel, CTypeInputModel, CTypeWrapperModel} from './CTypeSchema'

export default class CType {

    ctype: any;

    public constructor(ctype: any) {
        if (!CType.verifySchema(ctype, CTypeWrapperModel)) {
            // TODO: throw new
        }
        this.ctype = ctype;
        // TODO: calc hash if not yet done
    }


    public verifyClaimStructure(claim: any) : boolean {
        return CType.verifySchema(claim, this.ctype.schema);
    }

    public getModel(): any {
        return this.ctype;
    }

    private getLocalized(o: any, lang: string): any {
        if (lang == null || !o[lang]) return o.default;
        return o[lang];
    }

    public getClaimInputModel(lang: string): any {
        // create clone
        let result = JSON.parse(JSON.stringify(this.ctype.schema));
        result.title = this.getLocalized(this.ctype.metadata.title, lang);
        result.description = this.getLocalized(this.ctype.metadata.description, lang);
        result.required = [];
        for (let x in this.ctype.metadata.properties) {
            result.properties[x].title = this.getLocalized(this.ctype.metadata.properties[x].title, lang);
            result.required.push(x);
        }
        return result;
    }

    private static verifySchema(model: any, metaModel: any): boolean {
        // TODO: verify
        return true;
    }

    public static fromInputModel(ctypeInput: any): any {
        if (!CType.verifySchema(ctypeInput, CTypeInputModel)) {
            // TODO: throw new
        }
        let ctype = {
            schema: {
                "$id": ctypeInput.$id,
                "$schema": ctypeInput.$schema,
                properties: {},
                type: "object"
            },
            metadata: {
                title: {
                    default: ctypeInput.title
                },
                description: {
                    default: ctypeInput.description
                },
                properties: {}
            }
        };

        let properties = {};
        for (let i = 0; i < ctypeInput.properties.length; i++) {
            let p = ctypeInput.properties[i];
            properties[p["$id"]] = {type: p.type};
            ctype.metadata.properties[p["$id"]] = {
                title: {
                    default: p.title
                }
            };
        }
        ctype.schema.properties = properties;
        return new CType(ctype);
    }


    public static verifyClaimStructure(claim: any, schema: any) : boolean {
        if (!CType.verifySchema(schema, CTypeModel)) {
            // TODO: throw new
        }
        return CType.verifySchema(claim, schema);
    }
}

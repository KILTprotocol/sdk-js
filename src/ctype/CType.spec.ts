import CType from './CType'

describe('CType', () => {
    // TODO: better model
    it('verify model transformations', () => {
        const ctypeInput = {
            "$id": "CTYPE 1",
            "$schema": "http://kilt-protocol.org/draft-01/ctype#",
            "title": "CTYPE Title",
            "properties": [
                {
                    "title": "My First Property",
                    "$id": "first-property",
                    "type": "integer"
                },
                {
                    "title": "A new property is born",
                    "$id": "new-property",
                    "type": "string"
                }
            ],
            "type": "object"
        };
        const ctypeModel = {
            "schema": {
                "$id": "CTYPE 1",
                "$schema": "http://kilt-protocol.org/draft-01/ctype#",
                "properties": {"first-property": {"type": "integer"}, "new-property": {"type": "string"}},
                "type": "object"
            },
            "metadata": {
                "title": {"default": "CTYPE Title"},
                "description": {},
                "properties": {
                    "first-property": {"title": {"default": "My First Property"}},
                    "new-property": {"title": {"default": "A new property is born"}}
                }
            }
        };
        const claimInput = {
            "$id": "CTYPE 1",
            "$schema": "http://kilt-protocol.org/draft-01/ctype#",
            "properties": {
                "first-property": {"type": "integer", "title": "My First Property"},
                "new-property": {"type": "string", "title": "A new property is born"}
            },
            "type": "object",
            "title": "CTYPE Title",
            "required": ["first-property", "new-property"]
        };
        const claim = {
            "first-property": 10,
            "new-property": "12"
        };

        let ctype = CType.fromInputModel(ctypeInput);
        expect(JSON.stringify(ctype.getModel())).toEqual(JSON.stringify(ctypeModel));
        expect(JSON.stringify(ctype.getClaimInputModel("en"))).toEqual(JSON.stringify(claimInput));
        expect(ctype.verifyClaimStructure(claim)).toBeTruthy();
    })


});

import { toXML, XmlElement } from "jstoxml";
import { Criteria } from "./Criteria";
import { Base } from "./Base";

type TXMLFile ={
    path: string;
    content: XmlElement | XmlElement[];
    criterias: Criteria[]
}
export class XMLFile extends Base<TXMLFile> implements TXMLFile{
    path: string;
    content: XmlElement | XmlElement[];
    criterias: Criteria[] = []

    constructor(payload?: Partial<TXMLFile>) {
        super();
        this.fill(payload);
    }

    write() {
        const data = toXML(this.content, {
            header: true,
            indent: '    '
        });

        console.log(this.path, data)
    }
}
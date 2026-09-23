import { AditionalConfiguration, UIDeclaraitonConfig, UIDeclaration, XibNode } from "../types/entities";
import { RuleEngine } from "../utils/rules";
import { Resolve } from "./common_resolver";
import { capitalizeFirstLetter, lowerFirstletter, variableNameForTag } from "../utils/utils";
import { resolveIdToPropetyName } from "../types/xib_model";

export class UIDeclarationsGen {

    private declationConfig: UIDeclaraitonConfig = this.setupDeclarationConfig();
    private uiDeclarationsList: UIDeclaration[] = [];
    private rules: RuleEngine;

    constructor(rules: RuleEngine) {
        this.rules = rules;
    }

    private setupDeclarationConfig(node?: XibNode): UIDeclaraitonConfig {
        let hasActions = node?.content.some(child => child.tag == 'connections' && child.content.some(connection => connection.tag == 'action')) ?? false;
        let buttonType = node?.tag == 'button' ? node.attrs.buttonType : undefined;
        return {
            visibliityModifier: 'private ',
            // lazy, so action target `self` is the instance and not a method reference
            declarationKeyword: hasActions ? 'lazy var' : 'let',
            type: `UI${capitalizeFirstLetter(node?.tag ?? '')}`,
            intializationMethod: buttonType != undefined ? `(type: .${buttonType})` : '()',
            beforeInstaceProperties: ''
        }
    }

    public generateUIDeclarations(subviews: XibNode[]): string {
        let uiDeclarations: string = '';
        for (const subview of subviews) {
            uiDeclarations += this.resolveUIDeclaration(subview.content);
        }
        return uiDeclarations;
    }

    public generateUIDelarationsAsList(subviews: XibNode[]): UIDeclaration[] {
        this.uiDeclarationsList = [];
        for (const subview of subviews) {
            this.resolveUIDeclaration(subview.content);
        }
        return this.uiDeclarationsList;
    }

    private resolveUIDeclaration(nodes: XibNode[]): string {
        let uiDeclarations: string = '';
        nodes = nodes.filter(node => this.rules.shouldIgnoreTag(node.tag) == false);

        for (const node of nodes) {
            this.declationConfig = this.setupDeclarationConfig(node);
            let variableName: string = variableNameForTag(node.tag);
            let viewName: string = resolveIdToPropetyName(node.attrs.id);
            let properties: string = this.resolveAtributes(node, variableName);
            properties += `${this.generateDeclarationForSubNodes(node.tag, node.content, variableName)}`;

            let uiDeclaration: string = this.buildUIDeclaration(viewName, variableName, properties);
            uiDeclarations += uiDeclaration
            this.uiDeclarationsList.push({
                viewName: viewName,
                declaration: uiDeclaration
            });
        }
        return uiDeclarations;
    }

    private buildUIDeclaration(viewName: string, variableName: string, properties: string): string {
        return `\n${this.declationConfig.visibliityModifier}${this.declationConfig.declarationKeyword} ${viewName}: ${this.declationConfig.type} = {\n` +
            `${this.declationConfig.beforeInstaceProperties}` +
            `\tlet ${variableName} = ${this.declationConfig.type}${this.declationConfig.intializationMethod}` +
            `${properties}` +
            `\treturn ${variableName}\n}()\n`;
    }

    private resolveAtributes(node: XibNode, variableName: string): string {
        let attributes = node.attrs;
        let property: string = '\n';
        for (const key in attributes) {
            if (this.rules.shouldIgnoreProperty(node.tag, key)) continue;

            let propertyName = this.resolvePropertyName(node.tag, key);
            let propertyValue = this.resolveResultValue(attributes[key], key, node);
            let attributeDeclarion: string;
            if (Resolve.propertiesWithSetMethod.includes(propertyName)) {
                let setMethod = Resolve.resolveSetMethodForProperty(propertyName, propertyValue);
                if (setMethod == '') continue;
                attributeDeclarion = `\t${variableName}.${setMethod}\n`;
            } else {
                attributeDeclarion = `\t${variableName}.${propertyName} = ${propertyValue}\n`;
            }

            if (this.rules.shouldIgnorePropertyDeclaration(variableName, key, attributeDeclarion)) continue;
            property += attributeDeclarion;
        }
        return property;
    }

    private resolvePropertyName(tag: string, key: string): string {
        return this.rules.castPropertyIfNeeded(tag, key);
    }

    private resolveResultValue(result: string, property: string, node?: XibNode): string {
        const propertyToResolve: any = {
            'text': () => { return `"${result}"`; },
            'image': () => { return node != undefined ? `${Resolve.Image(node)}` : ''; },
            'customClass': () => {
                this.declationConfig.type = result;
                return '';
            },
            'lineBreakMode': () => {
                let lineBreakModes: any = {
                    'wordWrap': '.byWordWrapping',
                    'tailTruncation': '.byTruncatingTail',
                    'headTruncation': '.byTruncatingHead',
                    'middleTruncation': '.byTruncatingMiddle',
                    'charWrap': '.byCharWrapping',
                    'clip': '.byClipping',
                }
                return lineBreakModes[result] ?? '.byWordWrapping';
            },
            "placeholder": () => {
                return `"${result}"`;
            },
            'default': () => {
                switch (result) {
                    case "NO":
                        return "false";
                    case "YES":
                        return "true";
                    default:
                        return /\d/.test(result) ? result : `.${lowerFirstletter(result)}`;
                }
            },
        }
        return propertyToResolve[property] != undefined ? propertyToResolve[property]() : propertyToResolve['default']();
    }

    public generateDeclarationForSubNodes(tag: string, nodes: XibNode[], variableName: string = tag): string {
        let property: string = '';
        for (const node of nodes) {
            property += this.resolveSubNode(tag, node, variableName);
        }
        return property;
    }

    // tag picks the configuration, variableName is the view variable used in generated code
    private resolveSubNode(tag: string, node: XibNode, variableName: string = tag): string {
        const addAditionalConfiguration: AditionalConfiguration = {
            'button': {
                'state': () => {
                    let property = ``;
                    property += node.attrs.title != undefined ? `\t${variableName}.setTitle("${node.attrs.title ?? ''}", for: .${node.attrs.key})\n` : '';
                    property += node.attrs.image != undefined ? `\t${variableName}.setImage(${Resolve.Image(node)}, for: .${node.attrs.key})\n` : '';
                    property += node.attrs.backgroundImage != undefined ? `\t${variableName}.setBackgroundImage(${Resolve.Image(node)}, for: .${node.attrs.key})\n` : '';

                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'color') {
                            property += `\t${variableName}.set${capitalizeFirstLetter(child.attrs.key)}(${Resolve.Color(child)}, for: .${node.attrs.key})\n`
                        }
                        else if (child.tag == 'imageReference') {
                            property += `\t${variableName}.setImage(${Resolve.Image(child)}, for: .${node.attrs.key})\n`
                        }
                    }
                    return property;
                },
                'fontDescription': () => {
                    let weight = node.attrs.weight != undefined ? `, weight: .${node.attrs.weight}` : '';
                    return `\t${variableName}.titleLabel?.font = .systemFont(ofSize: ${node.attrs.pointSize}${weight})\n`
                },
                'buttonConfiguration': () => {
                    let property = `\t${variableName}.configuration = .${node.attrs.style}()\n`;
                    property += `\t${variableName}.setTitle("${node.attrs.title ?? ''}", for: .normal)\n`;

                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'color') {
                            property += `\t${variableName}.configuration?.${child.attrs.key} = ${Resolve.Color(child)}\n`;
                        }
                    }
                    return property;
                },
            },
            'collectionView': {
                'collectionViewFlowLayout': () => {
                    let property = '\tlet layout = UICollectionViewFlowLayout()\n';
                    let ignoredAttributes = ['id', 'key'];
                    let attributes = node.attrs;
                    for (const key in attributes) {
                        if (ignoredAttributes.includes(key)) continue;
                        property += `\tlayout.${key} = ${this.resolveResultValue(attributes[key], key)}\n`;
                    }
                    for (const child of node.content) {
                        if (child.tag == 'size') {
                            property += `\tlayout.${child.attrs.key} = CGSize(width: ${child.attrs.width}, height: ${child.attrs.height})\n`;
                        }
                    }
                    this.declationConfig.beforeInstaceProperties = property;
                    this.declationConfig.intializationMethod = '(frame: .zero, collectionViewLayout: layout)';
                    return '';
                },
            },
            "textField": {
                "textInputTraits": () => {
                    let property = '';
                    property += node.attrs.keyboardType != undefined ? `\t${variableName}.keyboardType = .${node.attrs.keyboardType}\n` : '';
                    return property;
                },
            },
            'common': {
                'color': () => { return `\t${variableName}.${node.attrs.key} = ${Resolve.Color(node)}\n` },
                'edgeInsets': () => {
                    return `\t${variableName}.${node.attrs.key} = UIEdgeInsets(top: ${node.attrs.top ?? 0}, left: ${node.attrs.left ?? 0}, bottom: ${node.attrs.bottom ?? 0}, right: ${node.attrs.right ?? 0})\n`
                },
                'directionalEdgeInsets': () => {
                    return `\t${variableName}.${node.attrs.key} = NSDirectionalEdgeInsets(top: ${node.attrs.top ?? 0}, leading: ${node.attrs.leading ?? 0}, bottom: ${node.attrs.bottom ?? 0}, trailing: ${node.attrs.trailing ?? 0})\n`
                },
                'fontDescription': () => {
                    let weight = node.attrs.weight != undefined ? `, weight: .${node.attrs.weight}` : '';
                    return `\t${variableName}.font = .systemFont(ofSize: ${node.attrs.pointSize}${weight})\n`
                },
                //'rect': () => { return `\t${variableName}.frame = CGRect(x: ${node.attrs.x}, y: ${node.attrs.y}, width: ${node.attrs.width}, height: ${node.attrs.height})\n` },
                'connections': () => {
                    let property = '';
                    let children = node.content;
                    for (const child of children) {
                        if (child.tag == 'action') {
                            property += `\t${variableName}.addTarget(self, action: #selector(${child.attrs.selector.replace(':', '')}), for: .${child.attrs.eventType})\n`;
                        }
                    }
                    return property
                },
                'userDefinedRuntimeAttributes': () => {
                    let property = '';
                    let children = node.content.filter(child => child.tag == 'userDefinedRuntimeAttribute');
                    for (const child of children) {
                        if (child.attrs.type == 'number') {
                            let number = child.content[0];
                            property += `\t${variableName}.${child.attrs.keyPath} = ${number.attrs.value}\n`;
                        }
                        else if (child.attrs.type == 'size') {
                            let size = child.content[0];
                            property += `\t${variableName}.${child.attrs.keyPath} = CGSize(width: ${size.attrs.width}, height: ${size.attrs.height})\n`;
                        }
                        else if (child.attrs.type == 'color') {
                            let color = child.content[0];
                            property += color != undefined ? `\t${variableName}.${child.attrs.keyPath} = ${Resolve.Color(color)}\n` : '';
                        }
                    }
                    return property;
                },
            }
        }

        if (addAditionalConfiguration[tag] == undefined || addAditionalConfiguration[tag][node.tag] == undefined) {
            return addAditionalConfiguration['common'][node.tag] != undefined ? addAditionalConfiguration['common'][node.tag]() : '';
        }
        return addAditionalConfiguration[tag][node.tag] != undefined ? addAditionalConfiguration[tag][node.tag]() : ''
    }

    public genereteBaseViewProperties(baseViews: XibNode[]): string {
        let property: string = '';
        for (const baseView of baseViews) {
            let variableName = resolveIdToPropetyName(baseView.attrs.id);
            property += this.resolveAtributes(baseView, variableName).trimStart();
            property += this.generateDeclarationForSubNodes(baseView.tag, baseView.content, variableName);
        }
        return property;
    }
}

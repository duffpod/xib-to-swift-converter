import { XibNode, Constraint, Constraints, LayoutConstraint, UIDeclaration } from "../types/entities";
import { Xib, resolveIdToPropetyName } from "../types/xib_model";

export class ConstraintsDeclaritonsGen {

    private constraints: Constraints;
    private prioritizedConstraints: string;
    private outletDeclarations: UIDeclaration[];

    public constructor() {
        this.constraints = {};
        this.prioritizedConstraints = '';
        this.outletDeclarations = [];
    }

    public generateConstraintsDeclarations(nodes: XibNode[]): string {
        for (const constraint of nodes) {
            this.resolveConstraintsDeclarations(constraint.content);
        }
        let prioritizedConstraints = this.prioritizedConstraints != '' ? this.prioritizedConstraints + '\n' : '';
        return `${prioritizedConstraints}NSLayoutConstraint.activate([${this.organizeConstraintsDeclarations()}])\n`;
    }

    // Declarations of constraints connected to IBOutlets, filled by generateConstraintsDeclarations
    public generateOutletDeclarations(): UIDeclaration[] {
        return this.outletDeclarations;
    }

    private resolveConstraintsDeclarations(nodes: XibNode[]): void {

        for (const node of nodes) {

            let grandFather = node.father?.father;
            if (grandFather == undefined) { console.log('\nerror\n'); continue; }

            let isOutlet = Xib.instace.hasOutlet(node.attrs.id);
            let constraint: LayoutConstraint = {
                firstItem: resolveIdToPropetyName(node.attrs.firstItem ?? grandFather.attrs.id),
                firstAttribute: this.resolveAttribute(node.attrs.firstAttribute),
                relation: node.attrs.relation ?? 'equal',
                secondItem: node.attrs.secondItem != undefined ? resolveIdToPropetyName(node.attrs.secondItem) : undefined,
                secondAttribute: node.attrs.secondAttribute != undefined ? this.resolveAttribute(node.attrs.secondAttribute) : undefined,
                multiplier: node.attrs.multiplier?.replace(':', '/'),
                constant: node.attrs.constant
            };

            // Prefer `child.bottom == parent.bottom - c` over `parent.bottom == child.bottom + c`.
            // Outlets keep the xib order, so changing their constant in code moves views the same way as before.
            let anchor = this.baseAttribute(constraint.firstAttribute);
            if ((anchor == 'bottom' || anchor == 'trailing') && constraint.secondItem != undefined && constraint.multiplier == undefined && !isOutlet) {
                constraint = this.reversed(constraint);
            }

            let declaration = this.buildConstraint(constraint);
            let priority = node.attrs.priority != undefined && node.attrs.priority != '1000' ? node.attrs.priority : undefined;
            if (isOutlet || priority != undefined) {
                let name = resolveIdToPropetyName(node.attrs.id);
                if (isOutlet) {
                    this.outletDeclarations.push({
                        viewName: name,
                        declaration: this.buildOutletDeclaration(name, declaration, priority)
                    });
                } else {
                    this.prioritizedConstraints += `let ${name} = ${declaration}\n${name}.priority = UILayoutPriority(${priority})\n`;
                }
                declaration = name;
            }

            this.pushConstraint(constraint.firstItem, {
                anchor: this.baseAttribute(constraint.firstAttribute),
                declaration: `\t${declaration},\n`
            });
        }
    }

    private buildConstraint(constraint: LayoutConstraint): string {
        let firstAnchor = this.anchor(constraint.firstItem, constraint.firstAttribute);
        if (constraint.secondItem == undefined || constraint.secondAttribute == undefined) {
            return `${firstAnchor}.constraint(${constraint.relation}ToConstant: ${constraint.constant ?? '0'})`;
        }

        let isDimension = constraint.firstAttribute == 'width' || constraint.firstAttribute == 'height';
        if (constraint.multiplier != undefined && !isDimension) {
            // anchors support multiplier only for width and height
            return `NSLayoutConstraint(item: ${constraint.firstItem}, attribute: .${constraint.firstAttribute}, relatedBy: .${constraint.relation}, ` +
                `toItem: ${constraint.secondItem}, attribute: .${constraint.secondAttribute}, multiplier: ${constraint.multiplier}, constant: ${constraint.constant ?? '0'})`;
        }

        let parameters = constraint.multiplier != undefined ? `, multiplier: ${constraint.multiplier}` : '';
        parameters += constraint.constant != undefined ? `, constant: ${constraint.constant}` : '';
        return `${firstAnchor}.constraint(${constraint.relation}To: ${this.anchor(constraint.secondItem, constraint.secondAttribute)}${parameters})`;
    }

    private anchor(item: string, attribute: string): string {
        let baseAttribute = this.baseAttribute(attribute);
        if (baseAttribute != attribute) {
            return `${item}.layoutMarginsGuide.${baseAttribute}Anchor`;
        }
        return `${item}.${attribute}Anchor`;
    }

    // xib names last baseline as `baseline`
    private resolveAttribute(attribute: string): string {
        return attribute == 'baseline' ? 'lastBaseline' : attribute;
    }

    // leadingMargin -> leading, centerXWithinMargins -> centerX
    private baseAttribute(attribute: string): string {
        return attribute.replace(/(Margin|WithinMargins)$/, '');
    }

    // first (relation) second + constant  <=>  second (reversed relation) first - constant
    private reversed(constraint: LayoutConstraint): LayoutConstraint {
        const reversedRelations: { [relation: string]: string } = {
            'lessThanOrEqual': 'greaterThanOrEqual',
            'greaterThanOrEqual': 'lessThanOrEqual'
        };
        let constant = constraint.constant;
        if (constant != undefined) {
            constant = constant.startsWith('-') ? constant.substring(1) : '-' + constant;
        }
        return {
            firstItem: constraint.secondItem!,
            firstAttribute: constraint.secondAttribute!,
            relation: reversedRelations[constraint.relation] ?? constraint.relation,
            secondItem: constraint.firstItem,
            secondAttribute: constraint.firstAttribute,
            constant: constant
        };
    }

    private buildOutletDeclaration(name: string, declaration: string, priority?: string): string {
        if (priority == undefined) {
            return `\nprivate lazy var ${name}: NSLayoutConstraint = ${declaration}\n`;
        }
        return `\nprivate lazy var ${name}: NSLayoutConstraint = {\n` +
            `\tlet constraint = ${declaration}\n` +
            `\tconstraint.priority = UILayoutPriority(${priority})\n` +
            `\treturn constraint\n}()\n`;
    }

    private pushConstraint(element: string, constraint: Constraint): void {
        this.constraints[element] = this.constraints[element] || [];
        this.constraints[element].push(constraint);
    }

    private organizeConstraintsDeclarations(): string {
        let declarations = '\n';
        for (const key in this.constraints) {
            let constraints = this.orderWithAnchor(this.constraints[key]);
            for (const constraint of constraints) {
                declarations += constraint.declaration;
            }
            declarations += '\n';
        }
        return declarations;
    }

    private orderWithAnchor(constraints: Constraint[]): Constraint[] {
        let order = ['top', 'bottom', 'leading', 'trailing', 'left', 'right', 'centerX', 'centerY', 'firstBaseline', 'lastBaseline', 'width', 'height'];
        // unknown anchors go last instead of being dropped
        let rank = (constraint: Constraint) => {
            let index = order.indexOf(constraint.anchor);
            return index == -1 ? order.length : index;
        };
        return [...constraints].sort((a, b) => rank(a) - rank(b));
    }
}

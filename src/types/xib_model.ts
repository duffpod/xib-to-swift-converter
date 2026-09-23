import { XibNode, IDtoName, Outlet } from './entities';
import { parser } from 'posthtml-parser'
import { capitalizeFirstLetter } from '../utils/utils';

const ViewControllerClasses: { [tag: string]: string } = {
    viewController: 'UIViewController',
    tableViewController: 'UITableViewController',
    collectionViewController: 'UICollectionViewController',
};

const LayoutGuideNames: { [key: string]: string } = {
    safeArea: 'safeAreaLayoutGuide',
};

export class Xib {
    public static instace: Xib;

    private xibNodes: XibNode[] = [];
    private outlets: Outlet[] = [];
    private filesOwner: XibNode | undefined;
    private objects: XibNode[] = [];
    private layoutGuides: XibNode[] = [];

    public className: string = '<#ClassName#>';
    public parentClassName: string = '<#UIViewController or UIView#>';
    public baseView: XibNode | undefined;
    // views configured by the generated class itself, e.g. root view, or cell and its content view
    public baseViews: XibNode[] = [];
    public constraints: XibNode[] = [];
    public subviews: XibNode[] = [];
    public tableIDtoName: IDtoName = {};

    public constructor(xib: string) {
        this.xibNodes = parser(xib, { xmlMode: true }) as XibNode[];
        this.xibNodes = this.clearEmptyNodes(this.xibNodes);
        this.navigateGettingInterestPoints(this.xibNodes);
        this.resolveClass();
        this.resolveLayoutGuides();
        Xib.instace = this;
    }

    private clearEmptyNodes(nodes: XibNode[], father?: XibNode): XibNode[] {
        let result: XibNode[] = [];
        if (Array.isArray(nodes)) {
            for (const node of nodes) {
                if ('object' == typeof node) {
                    node.father = father;
                    node.content = this.clearEmptyNodes(node.content, node);
                    if (node.tag == 'outlet') {
                        this.outlets.push({
                            property: node.attrs.property,
                            id: node.attrs.destination
                        });
                    }
                    result.push(node);
                }
            }
        }
        return result;
    }

    /**
     * navigateGettingInterestPoints to xib AST and get all points of interest, like outlets, subvies and constraints
     * @param nodes xib AST
     */
    private navigateGettingInterestPoints(nodes: XibNode[]): void {
        for (const node of nodes) {
            this.tableIDtoName[node.attrs?.id] = node.tag + '__' + node?.attrs?.id?.replaceAll('-', '_');

            switch (node.tag) {
                case 'objects':
                    this.objects.push(node);
                    break;
                case 'constraints':
                    this.constraints.push(node);
                    break;
                case 'subviews':
                    if (this.subviews.length == 0) this.resolveBaseView(node);
                    this.subviews.push(node);
                    break;
                case 'viewLayoutGuide':
                    this.layoutGuides.push(node);
                    break;
                case 'placeholder':
                    if (node.attrs.placeholderIdentifier == 'IBFilesOwner') {
                        this.filesOwner = node;
                    }
                    break;
                default:
                    break;
            }
            for (const outlet of this.outlets) {
                if (outlet.id == node?.attrs?.id) {
                    this.tableIDtoName[node.attrs.id] = outlet.property;
                }
            }
            this.navigateGettingInterestPoints(node.content);
        }
    }

    private resolveBaseView(node: XibNode): void {
        let father = node.father;
        if (father == undefined) return;
        this.baseView = father;
        if (father.attrs.id == undefined) {
            // content view of collection view cell has no id
            father.attrs.id = (father.father?.attrs.id ?? 'baseView') + '-' + (father.attrs.key ?? 'view');
        }
        if (father.attrs.key != undefined) {
            this.tableIDtoName[father.attrs.id] = father.attrs.key;
        }
    }

    private resolveClass(): void {
        let rootObject = this.baseView;
        while (rootObject?.father != undefined && rootObject.father.tag != 'objects') {
            rootObject = rootObject.father;
        }
        rootObject = rootObject ?? this.objects[0]?.content.find(node => node.tag != 'placeholder');
        if (rootObject == undefined) return;

        let ownerClass = this.filesOwner?.attrs.customClass;
        let ownerOutlets = this.filesOwner?.content.find(node => node.tag == 'connections')?.content ?? [];
        if (ViewControllerClasses[rootObject.tag] != undefined) {
            this.className = rootObject.attrs.customClass ?? this.className;
            this.parentClassName = ViewControllerClasses[rootObject.tag];
        } else if (ownerClass != undefined && ownerOutlets.some(node => node.tag == 'outlet' && node.attrs.property == 'view')) {
            this.className = ownerClass;
            this.parentClassName = 'UIViewController';
        } else {
            // generated class is the root view itself
            this.className = ownerClass ?? rootObject.attrs.customClass ?? this.className;
            this.parentClassName = ownerClass != undefined ? 'UIView' : `UI${capitalizeFirstLetter(rootObject.tag)}`;
            this.tableIDtoName[rootObject.attrs.id] = 'self';
        }

        for (let node = this.baseView; node != undefined; node = node.father) {
            // attributes of legacy collection view cell content view are not applied when loading from xib
            let isLegacyContentView = node.tag == 'view' && node.attrs.key == 'contentView' && node.father?.tag == 'collectionViewCell';
            if (ViewControllerClasses[node.tag] == undefined && !isLegacyContentView) this.baseViews.unshift(node);
            if (node === rootObject) break;
        }
    }

    private resolveLayoutGuides(): void {
        for (const guide of this.layoutGuides) {
            let owner = this.tableIDtoName[guide.father?.attrs.id ?? ''];
            this.tableIDtoName[guide.attrs.id] = `${owner}.${LayoutGuideNames[guide.attrs.key] ?? guide.attrs.key}`;
        }
    }

    public hasOutlet(id: string): boolean {
        return this.outlets.some(outlet => outlet.id == id);
    }

}

export function resolveIdToPropetyName(id: string): string {
    return Xib.instace.tableIDtoName[id];
}

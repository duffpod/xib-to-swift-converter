import { XibNode } from "../types/entities";
import { lowerFirstletter, swiftString } from "../utils/utils";


export class Resolve {

    // values that views loaded from xib get when attribute is absent, but which differ from defaults of views created in code
    public static xibDefaultAttributes: { [tag: string]: { [key: string]: string } } = {
        label: { textAlignment: 'left' },
        activityIndicatorView: { hidesWhenStopped: 'NO' },
    };

    public static propertiesWithSetMethod = ['horizontalHuggingPriority', 'verticalHuggingPriority', 'horizontalCompressionResistancePriority', 'verticalCompressionResistancePriority', 'animating'];

    public static Color(node: XibNode): string {
        let declaration: string = '';
        if (node.attrs.customColorSpace == 'genericGamma22GrayColorSpace' || node.attrs.colorSpace == 'genericGamma22GrayColorSpace') {
            declaration = `UIColor(cgColor: CGColor(genericGrayGamma2_2Gray: ${node.attrs.white}, alpha: ${node.attrs.alpha}))`;
        }
        else if (node.attrs.customColorSpace == 'sRGB' || node.attrs.colorSpace == 'sRGB') {
            declaration = `UIColor(cgColor: CGColor(srgbRed: ${node.attrs.red}, green: ${node.attrs.green}, blue: ${node.attrs.blue}, alpha: ${node.attrs.alpha}))`
        }
        else if (node.attrs.customColorSpace == 'displayP3' || node.attrs.colorSpace == 'displayP3') {
            declaration = `UIColor(displayP3Red: ${node.attrs.red}, green: ${node.attrs.green}, blue: ${node.attrs.blue}, alpha: ${node.attrs.alpha})`
        }
        // calibrated color spaces have 1.8 gamma, so the same components look lighter than in sRGB.
        // Swift marks their CGColorSpace constants unavailable, so they are looked up by name
        else if (node.attrs.customColorSpace == 'calibratedWhite' || node.attrs.colorSpace == 'calibratedWhite') {
            declaration = `UIColor(cgColor: CGColor(colorSpace: CGColorSpace(name: "kCGColorSpaceGenericGray" as CFString)!, components: [${node.attrs.white}, ${node.attrs.alpha}])!)`
        }
        else if (node.attrs.customColorSpace == 'calibratedRGB' || node.attrs.colorSpace == 'calibratedRGB') {
            declaration = `UIColor(cgColor: CGColor(colorSpace: CGColorSpace(name: "kCGColorSpaceGenericRGB" as CFString)!, components: [${node.attrs.red}, ${node.attrs.green}, ${node.attrs.blue}, ${node.attrs.alpha}])!)`
        }
        else if (node.attrs.systemColor != undefined) {
            declaration = `.${node.attrs.systemColor.replace('Color', '')}`
        }
        else if (node.attrs.name != undefined) {
            declaration = `UIColor(named: ${swiftString(node.attrs.name)})`
        }

        return declaration;
    }

    public static Image(node: XibNode): string {
        let declaration: string = '';
        if (node.attrs.backgroundImage != undefined) {
            declaration = node.attrs.catalog == 'system' ? `UIImage(systemName: ${swiftString(node.attrs.backgroundImage)})` : `UIImage(named: ${swiftString(node.attrs.backgroundImage)})`
        }
        else if (node.attrs.catalog == 'system') {
            declaration = `UIImage(systemName: ${swiftString(node.attrs.image)})`
        }
        else if (node.attrs.name != undefined) {
            declaration = `UIImage(named: ${swiftString(node.attrs.name)})`
        }
        else if (node.attrs.image != undefined) {
            declaration = `UIImage(named: ${swiftString(node.attrs.image)})`
        }

        return declaration;
    }

    public static Font(node: XibNode): string {
        let size = node.attrs.pointSize;
        if (node.attrs.style != undefined) {
            return `.preferredFont(forTextStyle: ${Resolve.TextStyle(node.attrs.style)})`;
        }
        if (node.attrs.name != undefined) {
            return `UIFont(name: ${swiftString(node.attrs.name)}, size: ${size}) ?? .systemFont(ofSize: ${size})`;
        }
        // boldSystemFont(ofSize:) is semibold, while bold system font in xib is bold
        if (node.attrs.type == 'boldSystem') {
            return `.systemFont(ofSize: ${size}, weight: .bold)`;
        }
        if (node.attrs.type == 'italicSystem') {
            return `.italicSystemFont(ofSize: ${size})`;
        }
        let weight = node.attrs.weight != undefined ? `, weight: .${node.attrs.weight}` : '';
        return `.systemFont(ofSize: ${size}${weight})`;
    }

    // e.g. UICTFontTextStyleHeadline -> .headline
    private static TextStyle(style: string): string {
        const renamedStyles: { [style: string]: string } = { Title0: 'largeTitle', Subhead: 'subheadline' };
        const styles = ['Title0', 'Title1', 'Title2', 'Title3', 'Headline', 'Subhead', 'Body', 'Callout', 'Footnote', 'Caption1', 'Caption2'];
        let name = style.replace(/^UICTFontTextStyle/, '');
        if (!styles.includes(name)) {
            return `UIFont.TextStyle(rawValue: ${swiftString(style)})`;
        }
        return `.${renamedStyles[name] ?? lowerFirstletter(name)}`;
    }

    public static resolveSetMethodForProperty(propertyName: string, propertyValue: string): string {
        const setMethodResolver: any = {
            'horizontalHuggingPriority': () => {
                return `setContentHuggingPriority(UILayoutPriority(${propertyValue}), for: .horizontal)`;
            },
            'verticalHuggingPriority': () => {
                return `setContentHuggingPriority(UILayoutPriority(${propertyValue}), for: .vertical)`;
            },
            'horizontalCompressionResistancePriority': () => {
                return `setContentCompressionResistancePriority(UILayoutPriority(${propertyValue}), for: .horizontal)`;
            },
            'verticalCompressionResistancePriority': () => {
                return `setContentCompressionResistancePriority(UILayoutPriority(${propertyValue}), for: .vertical)`;
            },
            'animating': () => {
                return propertyValue == 'true' ? 'startAnimating()' : '';
            }
        }
        return setMethodResolver[propertyName] != undefined ? setMethodResolver[propertyName]() : '';
    }
}

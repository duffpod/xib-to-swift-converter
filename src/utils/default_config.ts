import { PropertiesToCast, PropertiesToIgnore, PropertyDeclarationsToIgnore } from "../types/entities";

export class DefaultParserConfig {
    static readonly setupFunctionName: string = 'setupGeneratedViews';

    static readonly tagsToIgnore: string[] = [];

    static readonly propertyDeclarationsToIgnore: PropertyDeclarationsToIgnore = {
        opaque: 'isOpaque = false',
        userInteractionEnabled: 'isUserInteractionEnabled = false',
        customClass: 'customClass ='
    }

    static readonly propertiesToIgnore: PropertiesToIgnore = {
        label: ['minimumFontSize'],
        button: ['buttonType', 'lineBreakMode'],
        imageView: ['catalog'],
        tableView: ['style'],
        collectionView: ['dataMode'],
        common: ['fixedFrame', 'id', 'adjustsLetterSpacingToFitWidth', 'customModule', 'customModuleProvider', 'misplaced', 'userLabel'],
    }

    static readonly propertiesToCast: PropertiesToCast = {
        label: {
            adjustsFontSizeToFit: 'adjustsFontSizeToFitWidth',
        },
        slider: {
            minValue: 'minimumValue',
            maxValue: 'maximumValue',
        },
        switch: {
            on: 'isOn',
        },
        collectionView: {
            multipleTouchEnabled: 'isMultipleTouchEnabled',
            directionalLockEnabled: 'isDirectionalLockEnabled',
            pagingEnabled: 'isPagingEnabled',
            prefetchingEnabled: 'isPrefetchingEnabled',
        },
        common: {
            clipsSubviews: 'clipsToBounds',
            opaque: 'isOpaque',
            userInteractionEnabled: 'isUserInteractionEnabled',
        }
    }
}

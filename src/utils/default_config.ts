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
        segmentedControl: ['segmentControlStyle'],
        common: ['fixedFrame', 'id', 'adjustsLetterSpacingToFitWidth', 'customModule', 'customModuleProvider', 'misplaced', 'ambiguous', 'userLabel', 'placeholderIntrinsicWidth', 'placeholderIntrinsicHeight'],
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
        stackView: {
            layoutMarginsRelativeArrangement: 'isLayoutMarginsRelativeArrangement',
            baselineRelativeArrangement: 'isBaselineRelativeArrangement',
        },
        textView: {
            editable: 'isEditable',
            selectable: 'isSelectable',
        },
        common: {
            clipsSubviews: 'clipsToBounds',
            opaque: 'isOpaque',
            userInteractionEnabled: 'isUserInteractionEnabled',
            hidden: 'isHidden',
            multipleTouchEnabled: 'isMultipleTouchEnabled',
            exclusiveTouch: 'isExclusiveTouch',
            enabled: 'isEnabled',
            selected: 'isSelected',
            highlighted: 'isHighlighted',
            continuous: 'isContinuous',
            scrollEnabled: 'isScrollEnabled',
            pagingEnabled: 'isPagingEnabled',
            directionalLockEnabled: 'isDirectionalLockEnabled',
        }
    }
}

import { ParserConfiguration } from "../types/entities";
import { DefaultParserConfig } from "./default_config";

export const RegularExpressions = {
    IBOUTLET_VARNAME: (variableName: string) => {
        const basePattern: string = '.*@IBOutlet\\s+\\S+(\\s+\\S+)*\\s+';
        return new RegExp(basePattern + variableName + ':.*');
    }
}

// reserved words that can't be used as identifiers without backticks
export const SWIFT_KEYWORDS: string[] = [
    'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 'inout', 'internal',
    'let', 'operator', 'private', 'precedencegroup', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
    'typealias', 'var', 'break', 'case', 'catch', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for',
    'guard', 'if', 'in', 'repeat', 'return', 'throw', 'switch', 'where', 'while', 'Any', 'as', 'await', 'false', 'is',
    'nil', 'self', 'Self', 'super', 'throws', 'true', 'try'
]

export const AnotationConstants = {
    IB_ACTION: '@IBAction',
    OBJC: '@objc'
}

export const DEFAULT_PARSER_CONFIG: ParserConfiguration = {
    setupFunctionName: DefaultParserConfig.setupFunctionName,
    tagsToIgnore: DefaultParserConfig.tagsToIgnore,
    propertyDeclarationsToIgnore: DefaultParserConfig.propertyDeclarationsToIgnore,
    propertiesToIgnore: DefaultParserConfig.propertiesToIgnore,
    propertiesToCast: DefaultParserConfig.propertiesToCast
}

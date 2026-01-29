#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const htmlPrintWidth = 220;
const htmlTabWidth = 4;
const phpInlineMaxLength = 200;

const forceSingleLineAttributeTagNames = new Set([
    "video",
    "audio",
    "iframe",
    "img",
    "image",
    "source",
    "picture",
    "embed",
    "object",
    "param",
    "svg",
    "path",
    "circle",
    "rect",
    "line",
    "polyline",
    "polygon",
    "ellipse",
    "use",
    "canvas",
]);

const templateFileNames = new Set([
    "header.php",
    "footer.php",
    "404.php",
    "archive.php",
    "front-page.php",
    "home.php",
    "index.php",
    "page.php",
    "search.php",
    "sidebar.php",
    "single.php",
]);

function normalizeToLf(text) {
    return text.replace(/\r\n?/g, "\n");
}

function restoreLineEndings(text, lineEnding) {
    if (lineEnding === "\r\n") {
        return text.replace(/\n/g, "\r\n");
    }
    return text;
}

function findProjectRootDirectory(startDirectory) {
    let currentDirectory = startDirectory;

    while (true) {
        const packageJsonPath = path.join(currentDirectory, "package.json");
        if (fs.existsSync(packageJsonPath)) {
            return currentDirectory;
        }

        const parentDirectory = path.dirname(currentDirectory);
        if (parentDirectory === currentDirectory) {
            return startDirectory;
        }

        currentDirectory = parentDirectory;
    }
}

function doesFileLookLikeWordPressThemeStyleCss(styleCssAbsolutePath) {
    if (!fs.existsSync(styleCssAbsolutePath)) {
        return false;
    }

    try {
        const rawText = fs.readFileSync(styleCssAbsolutePath, "utf8");
        const headerChunk = rawText.slice(0, 8192);
        return /Theme\s+Name\s*:/i.test(headerChunk);
    } catch (error) {
        return false;
    }
}

function findWordPressThemeRootDirectoryForFile(absoluteFilePath) {
    let currentDirectory = path.dirname(absoluteFilePath);
    const rootDirectory = path.parse(currentDirectory).root;

    while (true) {
        const styleCssAbsolutePath = path.join(currentDirectory, "style.css");
        if (doesFileLookLikeWordPressThemeStyleCss(styleCssAbsolutePath)) {
            return currentDirectory;
        }

        if (currentDirectory === rootDirectory) {
            break;
        }

        const parentDirectory = path.dirname(currentDirectory);
        if (parentDirectory === currentDirectory) {
            break;
        }

        currentDirectory = parentDirectory;
    }

    return null;
}

function toPosixPath(filePath) {
    return filePath.split(path.sep).join("/");
}

function isTemplatePhpFile(relativeFilePathPosix) {
    if (relativeFilePathPosix.startsWith("acf/blocks/") && relativeFilePathPosix.endsWith(".php")) {
        return true;
    }

    if (relativeFilePathPosix.indexOf("/") === -1 && templateFileNames.has(relativeFilePathPosix)) {
        return true;
    }

    return false;
}

function normalizeTemplateHeaderPhpBlock(text) {
    const headerMatch = text.match(/^\s*<\?php[\s\S]*?\?>/i);
    if (!headerMatch) {
        return text;
    }

    const headerBlock = headerMatch[0].replace(/^\s*/, "");
    const headerPartsMatch = headerBlock.match(/^<\?php([\s\S]*?)\?>$/i);
    if (!headerPartsMatch) {
        return text;
    }

    let headerInner = headerPartsMatch[1];
    headerInner = normalizeToLf(headerInner);
    headerInner = headerInner.trim();

    let rest = text.slice(headerMatch[0].length);
    rest = rest.replace(/^\s+/, "");

    let newHeader = "<?php\n\n";
    if (headerInner.length > 0) {
        newHeader += headerInner + "\n\n";
    }
    newHeader += "?>\n\n";

    return newHeader + rest;
}

function maskPhpFragments(text) {
    const phpFragmentRegularExpression = /<\?(?:php\b|=)[\s\S]*?\?>/gi;

    const fragmentsByToken = new Map();
    let tokenIndex = 0;

    const resultParts = [];
    let lastIndex = 0;

    while (true) {
        const match = phpFragmentRegularExpression.exec(text);
        if (!match) {
            break;
        }

        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        const token = `__PHP_FRAGMENT_${tokenIndex}__`;
        tokenIndex += 1;

        fragmentsByToken.set(token, match[0]);

        resultParts.push(text.slice(lastIndex, startIndex));
        resultParts.push(token);

        lastIndex = endIndex;
    }

    resultParts.push(text.slice(lastIndex));

    return {
        maskedText: resultParts.join(""),
        fragmentsByToken,
    };
}

function simplifyPhpFragment(phpFragment) {
    const match = String(phpFragment).match(/^<\?(php|=)([\s\S]*?)\?>$/i);
    if (!match) {
        return phpFragment;
    }

    const opener = match[1].toLowerCase();
    let inner = match[2];

    inner = normalizeToLf(inner);

    if (inner.indexOf("//") !== -1) {
        return phpFragment;
    }
    if (inner.indexOf("#") !== -1) {
        return phpFragment;
    }
    if (inner.indexOf("/*") !== -1) {
        return phpFragment;
    }

    const collapsed = inner.replace(/\s+/g, " ").trim();

    if (collapsed.length <= phpInlineMaxLength) {
        if (opener === "=") {
            return `<?= ${collapsed} ?>`;
        }
        return `<?php ${collapsed} ?>`;
    }

    return phpFragment;
}

function separateAdjacentPhpTags(text) {
    return text.replace(/\?>[ \t]*<\?(php|=)/g, (fullMatch, type) => {
        return "?>\n<?" + type;
    });
}

function isStandalonePhpTagLine(trimmedLine) {
    if (!trimmedLine.endsWith("?>")) {
        return false;
    }

    if (trimmedLine.indexOf("<?") !== 0) {
        return false;
    }

    if (!trimmedLine.startsWith("<?php") && !trimmedLine.startsWith("<?=")) {
        return false;
    }

    return true;
}

function extractStandalonePhpInner(trimmedLine) {
    const match = trimmedLine.match(/^<\?(?:php|=)\s*([\s\S]*?)\s*\?>$/i);
    if (!match) {
        return "";
    }
    return match[1].trim();
}

function isPhpBlockClosingTag(phpInner) {
    const closingTags = [
        "endif;",
        "endif",
        "endforeach;",
        "endforeach",
        "endfor;",
        "endfor",
        "endwhile;",
        "endwhile",
        "endswitch;",
        "endswitch",
        "}",
    ];

    for (let i = 0; i < closingTags.length; i += 1) {
        if (phpInner === closingTags[i]) {
            return true;
        }
    }

    return false;
}

function isPhpBlockElseOrElseIfTag(phpInner) {
    if (phpInner === "else:" || phpInner === "else {") {
        return true;
    }

    if (/^elseif\s*\(/.test(phpInner) && (phpInner.endsWith(":") || phpInner.endsWith("{"))) {
        return true;
    }

    return false;
}

function isPhpBlockOpeningTag(phpInner) {
    const openingKeywords = ["if", "foreach", "for", "while", "switch"];

    for (let i = 0; i < openingKeywords.length; i += 1) {
        const keyword = openingKeywords[i];

        let startsAsBlock = false;
        if (phpInner.startsWith(keyword + " ")) {
            startsAsBlock = true;
        } else if (phpInner.startsWith(keyword + "(")) {
            startsAsBlock = true;
        } else if (phpInner.startsWith(keyword + "\t")) {
            startsAsBlock = true;
        }

        if (!startsAsBlock) {
            continue;
        }

        if (phpInner.endsWith(":") || phpInner.endsWith("{")) {
            return true;
        }
    }

    return false;
}

function applyHtmlIndentationToTagLines(text) {
    const voidTagNames = new Set([
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    ]);

    const lines = normalizeToLf(text).split("\n");
    const updatedLines = [];

    let htmlIndentLevel = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const originalLine = lines[lineIndex];
        const trimmedLine = originalLine.trim();

        if (trimmedLine.length === 0) {
            updatedLines.push("");
            continue;
        }

        const startsWithClosingTag = trimmedLine.startsWith("</");

        let indentLevelForLine = htmlIndentLevel;
        if (startsWithClosingTag) {
            indentLevelForLine = htmlIndentLevel - 1;
        }
        if (indentLevelForLine < 0) {
            indentLevelForLine = 0;
        }

        const indentation = " ".repeat(indentLevelForLine * htmlTabWidth);

        const isTagLikeLine =
            trimmedLine.startsWith("<") ||
            trimmedLine.startsWith("<?php") ||
            trimmedLine.startsWith("<?=");

        if (isTagLikeLine) {
            updatedLines.push(indentation + trimmedLine);
        } else {
            updatedLines.push(originalLine);
        }

        let lineForTagScan = trimmedLine;
        lineForTagScan = lineForTagScan.replace(/<\?(?:php\b|=)[\s\S]*?\?>/gi, "");
        lineForTagScan = lineForTagScan.replace(/<!--[\s\S]*?-->/g, "");

        const tags = lineForTagScan.match(/<\/?[A-Za-z][^>]*?>/g) || [];

        let openCount = 0;
        let closeCount = 0;

        for (let tagIndex = 0; tagIndex < tags.length; tagIndex += 1) {
            const tag = tags[tagIndex];

            if (tag.startsWith("</")) {
                closeCount += 1;
                continue;
            }

            if (tag.startsWith("<!")) {
                continue;
            }

            if (tag.endsWith("/>")) {
                continue;
            }

            const tagNameMatch = tag.match(/^<\s*([A-Za-z0-9-]+)/);
            if (tagNameMatch) {
                const tagName = tagNameMatch[1].toLowerCase();
                if (voidTagNames.has(tagName)) {
                    continue;
                }
            }

            openCount += 1;
        }

        htmlIndentLevel = htmlIndentLevel + openCount - closeCount;
        if (htmlIndentLevel < 0) {
            htmlIndentLevel = 0;
        }
    }

    return updatedLines.join("\n");
}

function applyPhpBlockChildIndentation(text) {
    const lines = normalizeToLf(text).split("\n");
    const indentedLines = [];

    let phpBlockIndentLevel = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const originalLine = lines[lineIndex];
        const trimmedLine = originalLine.trim();

        if (trimmedLine.length === 0) {
            indentedLines.push("");
            continue;
        }

        let shouldDecreaseBeforeLine = false;
        let shouldIncreaseAfterLine = false;
        let shouldDecreaseAndIncrease = false;

        if (isStandalonePhpTagLine(trimmedLine)) {
            const phpInner = extractStandalonePhpInner(trimmedLine);

            if (isPhpBlockClosingTag(phpInner)) {
                shouldDecreaseBeforeLine = true;
            } else if (isPhpBlockElseOrElseIfTag(phpInner)) {
                shouldDecreaseAndIncrease = true;
            } else if (isPhpBlockOpeningTag(phpInner)) {
                shouldIncreaseAfterLine = true;
            }
        }

        if (shouldDecreaseAndIncrease) {
            if (phpBlockIndentLevel > 0) {
                phpBlockIndentLevel -= 1;
            }
        } else if (shouldDecreaseBeforeLine) {
            if (phpBlockIndentLevel > 0) {
                phpBlockIndentLevel -= 1;
            }
        }

        const additionalIndentation = " ".repeat(phpBlockIndentLevel * htmlTabWidth);
        indentedLines.push(additionalIndentation + originalLine);

        if (shouldDecreaseAndIncrease) {
            phpBlockIndentLevel += 1;
        } else if (shouldIncreaseAfterLine) {
            phpBlockIndentLevel += 1;
        }
    }

    return indentedLines.join("\n");
}

function forceSingleLineAttributesOnSelectedTags(text) {
    const input = normalizeToLf(text);

    return input.replace(
        /<([A-Za-z][A-Za-z0-9-]*)\b([\s\S]*?)>/g,
        (fullMatch, tagNameRaw, attributesRaw) => {
            const tagName = String(tagNameRaw || "").toLowerCase();

            if (!forceSingleLineAttributeTagNames.has(tagName)) {
                return fullMatch;
            }

            const trimmedAttributes = String(attributesRaw || "");

            if (trimmedAttributes.indexOf("\n") === -1) {
                return fullMatch;
            }

            let normalizedAttributes = trimmedAttributes.replace(/\s*\n\s*/g, " ");
            normalizedAttributes = normalizedAttributes.replace(/\s{2,}/g, " ");
            normalizedAttributes = normalizedAttributes.replace(/\s+(\/?)\s*$/g, "$1");

            return "<" + tagNameRaw + normalizedAttributes + ">";
        }
    );
}

function extractPhpInnerFromTagText(tagText) {
    const match = String(tagText).match(/^<\?php\s*([\s\S]*?)\s*\?>$/i);
    if (!match) {
        return "";
    }
    return match[1].trim();
}

function isControlPhpTagText(tagText) {
    const phpInnerRaw = extractPhpInnerFromTagText(tagText);
    if (!phpInnerRaw) {
        return false;
    }

    const phpInner = phpInnerRaw.replace(/\s+/g, " ").trim();

    if (
        phpInner === "endif;" ||
        phpInner === "endif" ||
        phpInner === "endforeach;" ||
        phpInner === "endforeach" ||
        phpInner === "endfor;" ||
        phpInner === "endfor" ||
        phpInner === "endwhile;" ||
        phpInner === "endwhile" ||
        phpInner === "endswitch;" ||
        phpInner === "endswitch" ||
        phpInner === "else:" ||
        phpInner === "else {" ||
        phpInner === "}" ||
        phpInner === "{"
    ) {
        return true;
    }

    if (/^elseif\s*\(.*\)\s*(:|\{)$/.test(phpInner)) {
        return true;
    }

    if (/^(if|foreach|for|while|switch)\s*\(.*\)\s*(:|\{)$/.test(phpInner)) {
        return true;
    }

    return false;
}

function isPhpTagInsideHtmlOpeningTag(lineText, phpStartIndex) {
    const before = lineText.slice(0, phpStartIndex);

    const lastOpenBracketIndex = before.lastIndexOf("<");
    if (lastOpenBracketIndex === -1) {
        return false;
    }

    if (before.slice(lastOpenBracketIndex, lastOpenBracketIndex + 2) === "<?") {
        return false;
    }

    const lastCloseBracketIndex = before.lastIndexOf(">");

    return lastOpenBracketIndex > lastCloseBracketIndex;
}

function ensureControlPhpTagsAreStandalone(text) {
    const lines = normalizeToLf(text).split("\n");
    const outputLines = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const originalLine = lines[lineIndex];

        if (originalLine.trim().length === 0) {
            outputLines.push(originalLine);
            continue;
        }

        const phpTagRegularExpression = /<\?php[\s\S]*?\?>/g;

        let match;
        let didSplit = false;
        let currentSegmentStartIndex = 0;

        const lineIndentation = (originalLine.match(/^\s*/) || [""])[0];

        while ((match = phpTagRegularExpression.exec(originalLine)) !== null) {
            const phpStartIndex = match.index;
            const phpTagText = match[0];
            const phpEndIndex = phpStartIndex + phpTagText.length;

            let shouldIsolate = false;

            if (isControlPhpTagText(phpTagText)) {
                if (!isPhpTagInsideHtmlOpeningTag(originalLine, phpStartIndex)) {
                    shouldIsolate = true;
                }
            }

            if (!shouldIsolate) {
                continue;
            }

            const prefixSegment = originalLine.slice(currentSegmentStartIndex, phpStartIndex);

            if (prefixSegment.trim().length > 0) {
                outputLines.push(prefixSegment.replace(/[ \t]+$/g, ""));
            }

            outputLines.push(lineIndentation + phpTagText.trim());

            currentSegmentStartIndex = phpEndIndex;
            didSplit = true;
        }

        if (!didSplit) {
            outputLines.push(originalLine);
            continue;
        }

        const restSegment = originalLine.slice(currentSegmentStartIndex);

        if (restSegment.trim().length > 0) {
            outputLines.push(lineIndentation + restSegment.trimStart());
        }
    }

    return outputLines.join("\n");
}

async function formatAsPhp(prettier, absoluteFilePath, rawText, originalLineEnding) {
    const phpPluginPath = require.resolve("@prettier/plugin-php");

    let resolvedConfig = await prettier.resolveConfig(absoluteFilePath, { editorconfig: true });
    if (!resolvedConfig) {
        resolvedConfig = {};
    }

    const formatted = await prettier.format(rawText, {
        ...resolvedConfig,
        filepath: absoluteFilePath,
        parser: "php",
        plugins: [phpPluginPath],
        tabWidth: 4,
        useTabs: false,
    });

    return restoreLineEndings(normalizeToLf(formatted).trimEnd() + "\n", originalLineEnding);
}

async function formatAsTemplate(prettier, absoluteFilePath, rawText, originalLineEnding) {
    let workingText = normalizeToLf(rawText);
    workingText = normalizeTemplateHeaderPhpBlock(workingText);

    const masked = maskPhpFragments(workingText);

    let resolvedConfig = await prettier.resolveConfig(absoluteFilePath, { editorconfig: true });
    if (!resolvedConfig) {
        resolvedConfig = {};
    }

    let formattedHtml;
    try {
        formattedHtml = await prettier.format(masked.maskedText, {
            ...resolvedConfig,
            filepath: absoluteFilePath,
            parser: "html",
            printWidth: htmlPrintWidth,
            tabWidth: htmlTabWidth,
            useTabs: false,
            singleAttributePerLine: false,
            singleQuote: false,
            htmlWhitespaceSensitivity: "ignore",
            bracketSameLine: true,
        });
    } catch (error) {
        formattedHtml = normalizeToLf(masked.maskedText);
    }

    formattedHtml = normalizeToLf(formattedHtml);
    formattedHtml = forceSingleLineAttributesOnSelectedTags(formattedHtml);

    let unmaskedText = formattedHtml.replace(/__PHP_FRAGMENT_\d+__/g, (token) => {
        const originalPhp = masked.fragmentsByToken.get(token);
        if (!originalPhp) {
            return token;
        }
        return simplifyPhpFragment(originalPhp);
    });

    const fileName = path.basename(absoluteFilePath);

    if (fileName === "header.php") {
        unmaskedText = unmaskedText.replace(/<\/body>\s*<\/html>\s*$/i, "");
    }

    if (fileName === "footer.php") {
        unmaskedText = unmaskedText.replace(
            /^\s*<!DOCTYPE html>\s*<html>\s*<head>.*?<\/head>\s*<body>/is,
            ""
        );
        unmaskedText = unmaskedText.replace(/^\s*<body>/i, "");
    }

    unmaskedText = separateAdjacentPhpTags(unmaskedText);
    unmaskedText = ensureControlPhpTagsAreStandalone(unmaskedText);
    unmaskedText = applyHtmlIndentationToTagLines(unmaskedText);
    unmaskedText = applyPhpBlockChildIndentation(unmaskedText);
    unmaskedText = normalizeTemplateHeaderPhpBlock(unmaskedText);

    unmaskedText = unmaskedText.trimEnd() + "\n";
    return restoreLineEndings(unmaskedText, originalLineEnding);
}

async function formatFile(filePath) {
    const absoluteFilePath = path.resolve(filePath);

    if (!fs.existsSync(absoluteFilePath)) {
        process.exitCode = 1;
        return;
    }

    const rawBuffer = fs.readFileSync(absoluteFilePath);
    const rawText = rawBuffer.toString("utf8");

    let originalLineEnding = "\n";
    if (rawText.indexOf("\r\n") !== -1) {
        originalLineEnding = "\r\n";
    }

    const prettier = (await import("prettier")).default;

    const projectRootDirectory = findProjectRootDirectory(path.resolve(__dirname));
    const themeRootDirectory = findWordPressThemeRootDirectoryForFile(absoluteFilePath);

    let baseRootDirectory = projectRootDirectory;
    if (themeRootDirectory) {
        baseRootDirectory = themeRootDirectory;
    }

    const relativeFilePath = path.relative(baseRootDirectory, absoluteFilePath);
    const relativeFilePathPosix = toPosixPath(relativeFilePath);

    let finalText;
    if (isTemplatePhpFile(relativeFilePathPosix)) {
        finalText = await formatAsTemplate(prettier, absoluteFilePath, rawText, originalLineEnding);
    } else {
        finalText = await formatAsPhp(prettier, absoluteFilePath, rawText, originalLineEnding);
    }

    if (finalText !== rawText) {
        fs.writeFileSync(absoluteFilePath, finalText, "utf8");
        process.stdout.write(`Formatted: ${path.basename(filePath)}\n`);
    }
}

(async () => {
    const filePath = process.argv[2];

    if (!filePath) {
        process.exitCode = 1;
        return;
    }

    try {
        await formatFile(filePath);
    } catch (error) {
        process.exitCode = 1;
        if (error && error.message) {
            process.stderr.write(String(error.message) + "\n");
        } else {
            process.stderr.write(String(error) + "\n");
        }
    }
})();

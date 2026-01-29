// js/tools/blocks-apply.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DRY = !!process.env.DRY_RUN;

// ---- utils ----
function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
}
function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
}
function baseNoExt(f) {
    return f.replace(/\.[^.]+$/, "");
}
function ensureDirFor(p) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
}
function writeFile(p, content) {
    ensureDirFor(p);
    if (DRY) return console.log(`[dry] write ${p}`);
    fs.writeFileSync(p, content);
}
function removeFile(p) {
    if (fs.existsSync(p)) {
        if (DRY) return console.log(`[dry] rm ${p}`);
        fs.rmSync(p, { force: true });
    }
}
function removeTree(p) {
    if (fs.existsSync(p)) {
        if (DRY) return console.log(`[dry] rm -r ${p}`);
        fs.rmSync(p, { recursive: true, force: true });
    }
}
function uniq(a) {
    return Array.from(new Set(a));
}
function mapSlug(slug, aliases) {
    return aliases && aliases[slug] ? aliases[slug] : slug;
}
function studly(s) {
    return s
        .split(/[^a-z0-9]+/i)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
}
function assertValidSlug(s, ctx = "slug") {
    if (!/^[a-z0-9\-_]+$/i.test(s)) {
        throw new Error(`Invalid ${ctx}: "${s}". Allowed: [a-z0-9-_]`);
    }
}

// ---- pruning ----
function pruneDir(dir, keepSet, exts, aliasMap) {
    const removed = [];
    if (!fs.existsSync(dir)) return removed;
    const files = listFiles(dir);
    files.forEach((f) => {
        const ext = path.extname(f).toLowerCase();
        if (!exts.includes(ext)) return;
        const raw = baseNoExt(f).replace(/^_/, "");
        let keep = false;
        keepSet.forEach((k) => {
            const mapped = mapSlug(k, aliasMap);
            if (mapped === raw) keep = true;
        });
        if (!keep) {
            removeFile(path.join(dir, f));
            removed.push(f);
        }
    });
    return removed;
}

// ---- markers ----
function replaceBetweenMarkers(src, startMarker, endMarker, newLines) {
    const start = src.indexOf(startMarker);
    if (start === -1) return null;
    const end = src.indexOf(endMarker, start + startMarker.length);
    if (end === -1) return null;
    const before = src.slice(0, start + startMarker.length);
    const after = src.slice(end);
    return `${before}\n${newLines.join("\n")}\n${after}`;
}

// ---- style.scss rewrite (ALWAYS plain @import "..."; never url()) ----
function rewriteStyleScss(stylePath, scssBlocksDir, keep, scssAliases, removeWoo) {
    if (!fs.existsSync(stylePath)) return false;

    let txt = fs.readFileSync(stylePath, "utf8");

    // Remove Woo imports if disabled (match both url() and plain forms)
    if (removeWoo) {
        const wooRe =
            /^\s*@import\s+(?:url\((?:'|")?)?scss\/woocommerce\/[^'")]+(?:'|")?\)?\s*;\s*$/gim;
        txt = txt.replace(wooRe, "");
    }

    // Build block imports (plain form only -> Sass bundles)
    const imports = keep.map((k) => `@import "scss/blocks/${mapSlug(k, scssAliases)}";`);

    // Prefer markers — safest area to edit
    const replaced = replaceBetweenMarkers(
        txt,
        "/* @blocks:start */",
        "/* @blocks:end */",
        imports
    );
    if (replaced !== null) {
        writeFile(stylePath, replaced + "\n");
        return true;
    }

    // Fallback: scrub any existing blocks imports (both forms, also allow //-commented lines)
    const blocksLineRe =
        /^\s*(?:\/\/\s*)?@import\s+(?:url\((?:'|")?)?scss\/blocks\/[^'")]+(?:'|")?\)?\s*;\s*$/gim;
    txt = txt.replace(blocksLineRe, "");

    // Append new list at EOF
    txt += imports.length ? "\n" + imports.join("\n") + "\n" : "\n";
    writeFile(stylePath, txt);
    return true;
}

// ---- js index rewrite ----
function rewriteJsIndex(jsIndexPath, jsBlocksDir, keep, enableWoo, jsAliases) {
    if (!fs.existsSync(jsIndexPath)) return false;
    let txt = fs.readFileSync(jsIndexPath, "utf8");

    if (!enableWoo)
        txt = txt.replace(/^\s*\/{0,2}\s*import\s+['"]\.\/woocommerce\/[^'"]+['"];\s*$/gm, "");

    const imports = keep
        .map((k) => {
            const slug = mapSlug(k, jsAliases);
            const f = path.join(jsBlocksDir, `${slug}.js`);
            return fs.existsSync(f) ? `import './blocks/${slug}';` : "";
        })
        .filter(Boolean);

    const repl = replaceBetweenMarkers(txt, "/* @blocks:start */", "/* @blocks:end */", imports);
    if (repl !== null) {
        writeFile(jsIndexPath, repl + "\n");
        return true;
    }

    // Fallback: remove any existing block imports, then inject after last import
    txt = txt.replace(/^\s*\/{0,2}\s*import\s+['"]\.\/blocks\/[^'"]+['"];\s*$/gm, "");
    const lines = txt.split(/\r?\n/);
    let lastImport = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*import\s/.test(lines[i])) lastImport = i;
    }
    if (lastImport >= 0) {
        lines.splice(lastImport + 1, 0, ...imports);
        writeFile(jsIndexPath, lines.join("\n") + "\n");
        return true;
    }
    // If no imports at all: prepend
    const out = (imports.length ? imports.join("\n") + "\n" : "") + txt;
    writeFile(jsIndexPath, out);
    return true;
}

// ---- ACF helpers ----
function slugifyAcfBlockTitle(s) {
    return String(s || "")
        .replace(/^block:\s*/i, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function allowedAcfSets(keep, acfAliases) {
    const slugs = new Set(),
        full = new Set();
    keep.forEach((k) => {
        const a = acfAliases && acfAliases[k] ? acfAliases[k] : k;
        slugs.add(a);
        full.add("acf/" + a);
    });
    return { slugs, full };
}

function ensureFile(p, content) {
    if (!fs.existsSync(p)) writeFile(p, content);
}

function scaffoldPhpBlock(dir, slug) {
    const p = path.join(dir, `${slug}.php`);
    const cls = slug;
    const html = `<?php
$url='http://'.$_SERVER['SERVER_NAME'].$_SERVER['REQUEST_URI'];
$section_id=get_field('section_id');
$title=get_field('title');
$subtitle=get_field('subtitle');
$text=get_field('text');
?>
<div class="${cls}">
\t<?php if(!empty($section_id)):?><div class="section-id" id="<?php echo esc_html($section_id);?>"></div><?php endif;?>
\t<div class="container">
\t\t<div class="${cls}__wrapper">
\t\t\t<?php if(!empty($title)):?><h2 class="${cls}__title"><?php echo apply_filters('the_title',$title);?></h2><?php endif;?>
\t\t\t<?php if(!empty($subtitle)):?><h3 class="${cls}__subtitle"><?php echo apply_filters('the_title',$subtitle);?></h3><?php endif;?>
\t\t\t<?php if(!empty($text)):?><?php echo apply_filters('acf_the_content',str_replace('&nbsp;',' ',$text));?><?php endif;?>
\t\t</div>
\t</div>
</div>
`;
    ensureFile(p, html);
}

function scaffoldScssBlock(dir, slug) {
    const p = path.join(dir, `_${slug}.scss`);
    const cls = slug;
    const scss = `.${cls}{
\tposition:relative;
\twidth:100%;
}
`;
    ensureFile(p, scss);
}

function scaffoldJsBlock(dir, slug) {
    const p = path.join(dir, `${slug}.js`);
    const js = `document.addEventListener('DOMContentLoaded',()=>{});`;
    ensureFile(p, js);
}

function hashKey(s) {
    return crypto.createHash("md5").update(String(s)).digest("hex").slice(0, 12);
}
function groupFilenameFor(slug) {
    return `group_${hashKey("acf/" + slug)}.json`;
}

function ensureAcfJson(localDir, slug) {
    const want = "acf/" + slug;
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const files = listFiles(localDir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(localDir, f), "utf8"));
            const loc = data && data.location ? data.location : [];
            let match = false;
            loc.forEach((andG) => {
                (andG || []).forEach((rule) => {
                    if (rule && rule.param === "block" && rule.value === want) match = true;
                });
            });
            if (match) return;
        } catch (e) {}
    }
    const file = path.join(localDir, groupFilenameFor(slug));
    if (fs.existsSync(file)) return;
    const title = "Block: " + studly(slug);
    const group = {
        key: "group_" + hashKey("key:" + slug),
        title: title,
        fields: [],
        location: [[{ param: "block", operator: "==", value: want }]],
        active: 1,
        description: "",
        menu_order: 0,
        position: "normal",
        style: "default",
        label_placement: "top",
        instruction_placement: "label",
        hide_on_screen: "",
        show_in_rest: 0,
        modified: Math.floor(Date.now() / 1000),
    };
    writeFile(file, JSON.stringify(group, null, 2));
}

function pruneAcfLocalJson(localDir, keep, acfAliases) {
    const removed = [];
    if (!fs.existsSync(localDir)) return removed;
    const { slugs, full } = allowedAcfSets(keep, acfAliases);
    const files = listFiles(localDir).filter((f) => f.endsWith(".json"));
    files.forEach((f) => {
        const fullPath = path.join(localDir, f);
        let data = null;
        try {
            data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        } catch (e) {
            data = null;
        }
        if (!data) return;
        const title = String(data.title || data.label || "").trim();
        const isTitleBlock = /^block:\s*/i.test(title);
        const isTitleKeep = /^(theme settings|component|global)/i.test(title);
        const loc = data.location;
        let hasTargeted = false,
            matches = false,
            keepByRule = false;
        if (Array.isArray(loc)) {
            loc.forEach((andG) => {
                (andG || []).forEach((rule) => {
                    if (rule && rule.param === "block") {
                        const v = String(rule.value || "").toLowerCase();
                        if (v === "all" || v === "acf/all" || v === "*") keepByRule = true;
                        if (v.startsWith("acf/") && v !== "acf/all") hasTargeted = true;
                        if (full.has(v) || slugs.has(v.replace(/^acf\//, ""))) matches = true;
                    }
                });
            });
        }
        let isBlockGroup = hasTargeted || isTitleBlock;
        if (isTitleKeep || keepByRule) isBlockGroup = false;
        if (isBlockGroup && !matches) {
            removeFile(fullPath);
            removed.push(f);
        }
    });
    return removed;
}

// ---- blocks.php generation (kept as before, but stable) ----
function filterBlocksPhp(blocksPhpPath, keep) {
    if (!fs.existsSync(blocksPhpPath)) return false;
    const txt = fs.readFileSync(blocksPhpPath, "utf8");
    const body = txt.replace(/^<\?php\s*/, "").trim();
    const items = {};
    const re = /'([a-z0-9\-\_]+)'\s*=>\s*\[/gi;
    let m;
    while ((m = re.exec(body)) !== null) {
        const slug = m[1];
        const start = m.index;
        let i = re.lastIndex,
            depth = 1;
        while (i < body.length && depth > 0) {
            const ch = body[i++];
            if (ch === "[") depth++;
            else if (ch === "]") depth--;
        }
        const end = i;
        items[slug] = body.slice(start, end) + ",";
    }
    // keep order from keep[]
    const parts = [];
    keep.forEach((slug) => {
        if (items[slug]) parts.push(items[slug]);
        else {
            const title = slug.replace(/[\-\_]+/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
            parts.push(
                `'${slug}' => [ 'title' => __('${title}', 'askeetheme'), 'category' => 'askeetheme', 'align' => 'full' ],`
            );
        }
    });
    const out = "<?php\nreturn [\n\t" + parts.join("\n\t") + "\n];\n";
    writeFile(blocksPhpPath, out);
    return true;
}

// ---- main ----
function run() {
    // guard node version for fs.rmSync (>=14.14)
    const [maj, min] = process.versions.node.split(".").map(Number);
    if (maj < 14 || (maj === 14 && min < 14)) {
        console.error("Node 14.14+ required (fs.rmSync).");
        process.exit(1);
    }

    const cfg = readJson(path.resolve("blocks.use.json"));
    const keep = uniq(cfg.keep.map(String));
    keep.forEach((s) => assertValidSlug(s, "keep slug"));

    const keepSet = new Set(keep);
    const scssAliases = (cfg.aliases && cfg.aliases.scss) || {};
    const jsAliases = (cfg.aliases && cfg.aliases.js) || {};
    const acfAliases = (cfg.aliases && cfg.aliases.acf) || {};
    Object.values(scssAliases).forEach((s) => assertValidSlug(s, "scss alias"));
    Object.values(jsAliases).forEach((s) => assertValidSlug(s, "js alias"));

    const removeWoo = cfg.features && cfg.features.woocommerce === false;

    const paths = {
        styleScss: path.resolve("style.scss"),
        phpBlocks: path.resolve("acf/blocks"),
        phpBlocksList: path.resolve("acf/blocks.php"),
        scssBlocks: path.resolve("scss/blocks"),
        jsIndex: path.resolve("js/src/index.js"),
        jsBlocks: path.resolve("js/src/blocks"),
        scssWoo: path.resolve("scss/woocommerce"),
        jsWoo: path.resolve("js/src/woocommerce"),
        acfLocal: path.resolve("acf/local-json"),
    };

    // scaffold
    keep.forEach((slug) => {
        scaffoldPhpBlock(paths.phpBlocks, slug);
        scaffoldScssBlock(paths.scssBlocks, mapSlug(slug, scssAliases));
        scaffoldJsBlock(paths.jsBlocks, mapSlug(slug, jsAliases));
        ensureAcfJson(paths.acfLocal, slug);
    });

    // prune
    const removed = {
        php: pruneDir(paths.phpBlocks, keepSet, [".php"]),
        scss: pruneDir(paths.scssBlocks, keepSet, [".scss"], scssAliases),
        js: pruneDir(paths.jsBlocks, keepSet, [".js", ".mjs", ".ts"], jsAliases),
        acfJson: pruneAcfLocalJson(paths.acfLocal, keep, acfAliases),
    };

    // rewrites
    rewriteStyleScss(paths.styleScss, paths.scssBlocks, keep, scssAliases, removeWoo);
    rewriteJsIndex(paths.jsIndex, paths.jsBlocks, keep, !removeWoo, jsAliases);

    // remove Woo trees if disabled
    if (removeWoo) {
        removeTree(paths.scssWoo);
        removeTree(paths.jsWoo);
    }

    // blocks.php
    filterBlocksPhp(paths.phpBlocksList, keep);

    process.stdout.write(JSON.stringify({ kept: keep, removed }, null, 2) + "\n");
}

run();

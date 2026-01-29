<?php
add_filter(
    "big_image_size_threshold",
    function ($threshold, $imagesize, $file, $attachment_id) {
        return 1920;
    },
    10,
    4,
);

add_filter(
    "wp_editor_set_quality",
    function ($quality, $mime) {
        if ($mime === "image/jpeg") {
            return 82;
        }
        if ($mime === "image/webp") {
            return 82;
        }
        return $quality;
    },
    10,
    2,
);

add_filter("image_editor_output_format", function ($formats) {
    $formats["image/jpeg"] = "image/webp";
    $formats["image/png"] = "image/webp";
    return $formats;
});

add_filter(
    "wp_generate_attachment_metadata",
    function ($metadata, $attachment_id) {
        $filePath = get_attached_file($attachment_id);
        $mimeType = get_post_mime_type($attachment_id);
        if (strpos((string) $mimeType, "image/") !== 0) {
            return $metadata;
        }

        $imageEditor = wp_get_image_editor($filePath);
        if (is_wp_error($imageEditor)) {
            return $metadata;
        }

        $imageSize = $imageEditor->get_size();
        $maxWidth = 1920;

        if (isset($imageSize["width"]) && $imageSize["width"] > $maxWidth) {
            $ratio = $imageSize["height"] / $imageSize["width"];
            $newHeight = (int) round($maxWidth * $ratio);
            $imageEditor->resize($maxWidth, $newHeight, false);
            $saved = $imageEditor->save($filePath);
            if (!is_wp_error($saved) && isset($saved["path"])) {
                update_attached_file($attachment_id, $saved["path"]);
            }
        }

        return $metadata;
    },
    10,
    2,
);

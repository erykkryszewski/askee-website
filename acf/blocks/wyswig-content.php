<?php

$url = "http://" . $_SERVER["SERVER_NAME"] . $_SERVER["REQUEST_URI"];
$section_id = get_field("section_id");
$background = get_field("background");
$content = get_field("content");

?>

<div class="wyswig-content <?php if ($background == 'true') { echo 'wyswig-content--background'; } ?>">
    <?php if (!empty($section_id)): ?>
        <div class="section-id" id="<?php echo esc_html($section_id); ?>"></div>
    <?php endif; ?>
    <div class="container">
        <div class="wyswig-content__wrapper"><?php echo apply_filters('acf_the_content', str_replace('&nbsp;', ' ', $content)); ?></div>
    </div>
</div>

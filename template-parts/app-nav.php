<?php

$pages_map = [
    "home" => [
        "label" => "Strona główna",
        "url" => home_url("/"),
        "is_active" => is_front_page(),
    ],
    "chat" => [
        "label" => "Czat",
        "url" => home_url("/chat/"),
        "is_active" => is_page("chat"),
    ],
    "o-nas" => [
        "label" => "O nas",
        "url" => home_url("/o-nas/"),
        "is_active" => is_page("o-nas"),
    ],
    "nasza-filozofia" => [
        "label" => "Nasza filozofia",
        "url" => home_url("/nasza-filozofia/"),
        "is_active" => is_page("nasza-filozofia"),
    ],
    "kontakt" => [
        "label" => "Kontakt",
        "url" => home_url("/kontakt/"),
        "is_active" => is_page("kontakt"),
    ],
    "aktualnosci" => [
        "label" => "Aktualności",
        "url" => home_url("/aktualnosci/"),
        "is_active" => is_page("aktualnosci"),
    ],
]; ?>

<div class="askee-app-nav" data-askee-ui="app-nav">
    <div class="container">
        <div class="askee-app-nav__buttons">
            <?php foreach ($pages_map as $item_data): ?>
                <?php
                $url_string = $item_data["url"];
                $label_string = $item_data["label"];
                $is_active = !empty($item_data["is_active"]);
                ?>
                <a class="button <?php echo $is_active ? "is-active" : ""; ?>"
                   href="<?php echo esc_url($url_string); ?>">
                    <?php echo esc_html($label_string); ?>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</div>

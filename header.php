<?php

$custom_classes = []; if (!is_front_page()) { $custom_classes[] = "theme-subpage"; } else { $custom_classes[] = "theme-frontpage"; }

?>

<!DOCTYPE html>
<html lang="<?php bloginfo('language'); ?>">
    <head>
        <meta charset="<?php bloginfo('charset'); ?>" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
        <?php wp_head(); ?>
    </head>

    <body <?php body_class($custom_classes); ?>>
        <header class="header <?php if (is_front_page()) { echo "header--homepage"; } else { echo 'header--subpage'; } ?>">
            <div class="container-fluid container-fluid--padding">
                <div class="header__wrapper">
                    <div class="row header__row">
                        <div class="col-6 col-lg-3 col-xl-2 header__column">
                            <a href="/" class="header__logo"><?php echo wp_get_attachment_image(5066, 'large'); ?></a>
                        </div>
                        <div class="col-6 col-lg-3 col-xl-2 header__column header__column--right">
                            <a href="/chat" class="button button--header">Porozmawiajmy!</a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
        <main id="askee-app-content" class="askee-app-content">

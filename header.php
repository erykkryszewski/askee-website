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
        <header class="header <?php if (!is_front_page()) { echo 'header--subpage'; } ?>">
            <div class="container">
                <nav class="nav <?php if (!is_front_page()) { echo 'nav--subpage';} ?>">
                    <a href="/" class="nav__logo <?php if (!is_front_page()) { echo 'nav__logo--subpage'; } ?>">Logo</a>
                    <div class="nav__content <?php if (!is_front_page()) { echo 'nav__content--subpage'; } ?>">
                        <?php $menu_class = is_front_page() ? 'nav__menu' : 'nav__menu nav__menu--subpage'; echo wp_nav_menu(['theme_location' => 'Navigation', 'container' => 'ul', 'menu_class' => $menu_class]); ?>
                        <div class="hamburger nav__hamburger <?php if (!is_front_page()) { echo 'nav__hamburger--subpage';} ?>">
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
        <main id="askee-app-content" class="askee-app-content">

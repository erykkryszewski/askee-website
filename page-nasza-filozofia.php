<?php

get_header(); the_post();

?>

<div class="askee-chat askee-our-philosophy">
    <div class="container-fluid container-fluid--padding" data-askee-page="our-philosophy">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--default" id="askee-chat-content-default">
                                <span class="askee-our-philosophy__welcome-wrapper">
                                    <p class="askee-chat__welcome">Chcesz poznać naszą filozofię?</p>
                                    <!-- <button class="button button--ghost">Tak</button> -->
                                </span>
                                <div>
                                    <div class="askee-our-philosophy__icons">
                                        <div class="askee-our-philosophy__column askee-our-philosophy__column--left">
                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5062, 'large'); ?>
                                                <h4>Transparentność</h4>
                                            </div>

                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5061, 'large'); ?>
                                                <h4>Etyka i bezstronność</h4>
                                            </div>
                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5060, 'large'); ?>
                                                <h4>Prywatność i bezpieczeństwo</h4>
                                            </div>
                                        </div>
                                        <div class="askee-our-philosophy__column askee-our-philosophy__column--mid">
                                            <div class="askee-our-philosophy__item askee-our-philosophy__item--big"><?php echo wp_get_attachment_image(5091, 'large'); ?></div>
                                        </div>
                                        <div class="askee-our-philosophy__column askee-our-philosophy__column--right">
                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5059, 'large'); ?>
                                                <h4>Użytkownik w centrum uwagi</h4>
                                            </div>

                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5058, 'large'); ?>
                                                <h4>Ciągły rozwój</h4>
                                            </div>
                                            <div class="askee-our-philosophy__item">
                                                <?php echo wp_get_attachment_image(5057, 'large'); ?>
                                                <h4>Zgodność z przepisami</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span class="askee-our-philosophy__welcome-wrapper">
                                        <p>Chcesz wiedzieć jak przetwarzam dane?</p>
                                        <button class="button button--ghost">Tak</button>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>

                    <div class="askee-chat__buttons">
                        <a class="button button--light" href="/poznaj-mnie" data-id="askee-chat-content-meet">Poznaj mnie</a>
                        <a class="button button--light" href="/obszary-wsparcia" data-id="askee-chat-content-areas">Obszary wsparcia</a>
                        <a class="button button--light" href="/jak-moge-ci-pomoc" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</a>
                        <a class="button button--light" href="/warunki-wspolpracy" data-id="askee-chat-content-terms">Warunki współpracy</a>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>

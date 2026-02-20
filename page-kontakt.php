<?php

get_header(); the_post();

?>

<div class="askee-chat askee-contact">
    <div class="container-fluid container-fluid--padding" data-askee-page="contact">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--default" id="askee-chat-content-default">
                                <span class="askee-contact__welcome-wrapper">
                                    <p class="askee-chat__welcome">Kontakt z nami:?</p>
                                </span>
                                <div>
                                    <div class="askee-contact__content">
                                        <div class="askee-contact__image"><?php echo wp_get_attachment_image(5056, 'large'); ?></div>
                                        <div class="askee-contact__info">
                                            <p>Askee Sp. z o.o.</p>
                                            <p>ul. Gostyńska 91, 80-298 Gdańsk</p>
                                            <p>NIP: 5223018301</p>
                                            <a href="mailto:kontakt@askee.pl">Email: kontakt@askee.pl</a>
                                            <a href="tel:+48500025365">Tel. 500 025 365</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Masz pytania? Jesteś zainteresowany/-a ASKEE? Odezwij się do nas!" required></textarea>

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

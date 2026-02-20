<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="letstalk">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--letstalk askee-chat__content--active" id="askee-chat-content-letstalk">
                                <p class="askee-chat__welcome">Opowiem, jak pracuję. Jeśli chcesz porozmawiać z moimi twórcami, zostaw dane kontaktowe lub wybierz termin spotkania, który Ci pasuje.</p>
                                <div class="askee-chat__inner-buttons">
                                    <button class="button button--ghost">12.02 - czwartek, 10:00</button>
                                    <button class="button button--ghost">12.02 - czwartek, 10:00</button>
                                    <button class="button button--ghost">12.02 - czwartek, 10:00</button>
                                    <button class="button button--ghost">12.02 - czwartek, 10:00</button>
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

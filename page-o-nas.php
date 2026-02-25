<?php

get_header();
the_post();

?>

<div class="askee-chat askee-about">
    <div class="container-fluid container-fluid--padding" data-askee-page="about" data-askee-topic="o-nas">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__user-message">
                                <p></p>
                                <div class="askee-chat__profile-picture">
                                    <img src="<?php echo get_template_directory_uri(); ?>/images/hr-payroll.svg" alt="user-profile-picture" />
                                </div>
                            </div>
                            <div class="askee-chat__content askee-chat__content--default askee-chat__content--active" id="askee-chat-content-default">
                                <p class="askee-chat__welcome">
                                    Za mną stoi zespół, który od lat wspiera organizacje w ich rozwoju. W Askee łączymy technologię z doświadczeniem, tworząc narzędzia, które naprawdę ułatwiają pracę. Naszą misją jest wspierać ludzi w podejmowaniu lepszych decyzji, bez zbędnych komplikacji. Chcesz dowiedzieć się, co nas wyróżnia?
                                </p>
                                <div class="askee-chat__info-buttons askee-chat__info-buttons--suggestions">
                                    <button type="button" class="button button--ghost">Opowiedz, jakie macie doświadczenie w pracy z organizacjami.</button>
                                    <button type="button" class="button button--ghost">Pokaż, jak powstał pomysł na Askee.</button>
                                    <button type="button" class="button button--ghost">Opowiedz, jak wygląda współpraca z Waszym zespołem.</button>
                                </div>
                            </div>
                        </div>

                        <form class="askee-chat__form">
                            <textarea class="askee-chat__textarea" name="user_message" placeholder="Wyślij wiadomość do Askee..." required></textarea>

                            <button type="submit" class="askee-chat__submit"><?php echo wp_get_attachment_image(5070, "large"); ?></button>
                        </form>
                    </div>

                    <div class="askee-chat__buttons">
                        <a class="button button--light" href="/poznaj-mnie/" data-id="askee-chat-content-meet">Poznaj mnie</a>
                        <a class="button button--light" href="/obszary-wsparcia/" data-id="askee-chat-content-areas">Obszary wsparcia</a>
                        <a class="button button--light" href="/jak-moge-ci-pomoc/" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</a>
                        <a class="button button--light" href="/warunki-wspolpracy/" data-id="askee-chat-content-terms">Warunki współpracy</a>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>

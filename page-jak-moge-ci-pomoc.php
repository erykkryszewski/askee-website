<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="help" data-askee-topic="jak-moge-ci-pomoc">
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
                            <div class="askee-chat__content askee-chat__content--help askee-chat__content--active" id="askee-chat-content-help">
                                <p class="askee-chat__welcome">Wiem, że każda rola w organizacji ma inne potrzeby.</p>

                                <div class="askee-chat__text-with-image">
                                    <div><?php echo wp_get_attachment_image(5192, 'large', '', ['class' => 'askee-welcome-img']); ?></div>
                                    <p>
                                        Dla pracowników upraszczam codzienne zadania, dla menedżerów daję pełny obraz zespołu, a dla HR-u i zarządu tworzę przestrzeń do świadomych decyzji. Powiedz mi, jaka rola najlepiej
                                        opisuje Ciebie, a pokażę, jak mogę Cię wesprzeć.
                                    </p>
                                </div>

                                <div class="askee-chat__info-buttons askee-chat__info-buttons--suggestions askee-chat__info-buttons--static">
                                    <button type="button" class="button button--ghost">Pokaż, jak pomagasz pracownikom w codziennych sprawach.</button>
                                    <button type="button" class="button button--ghost">Pokaż, jak wspierasz menedżerów w pracy z zespołem.</button>
                                    <button type="button" class="button button--ghost">Pokaż, jak pomagasz HR i zarządowi w decyzjach i strategii.</button>
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

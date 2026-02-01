<?php

get_header(); the_post();

?>

<div class="askee-chat">
    <div class="container-fluid container-fluid--padding" data-askee-page="meet">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <h1 class="askee-chat__title">Koniec z „kto ma do tego dostęp?”.</h1>

                    <div class="askee-chat__box">
                        <div class="askee-chat__switch-sections">
                            <div class="askee-chat__content askee-chat__content--meet askee-chat__content--active" id="askee-chat-content-meet">
                                <p class="askee-chat__welcome">
                                    Jestem Twoim asystentem w codziennej pracy. Zapewniam szybki dostęp do potrzebnych informacji w jednym i prostym interfejsie. Pomogę Ci oszczędzić czas, ograniczę szukanie w wielu
                                    źródłach, wspieram w realizacji kluczowych zadań.
                                </p>
                                <div class="askee-chat__info-buttons">
                                    <div class="askee-chat__info-element">
                                        <p>Cechuje mnie</p>
                                        <button class="button button--ghost button--accessibility">Dostępność</button>
                                    </div>
                                    <div class="askee-chat__info-element">
                                        <p>Jestem</p>
                                        <button class="button button--ghost button--simple-to-use">Prosty w użyciu</button>
                                    </div>
                                    <div class="askee-chat__info-element">
                                        <p>Wspieram</p>
                                        <button class="button button--ghost button--various-areas">Różne obszary</button>
                                    </div>
                                    <div class="askee-chat__info-element">
                                        <p>Dbam o</p>
                                        <button class="button button--ghost button--data-security">Bezpieczeństwo danych</button>
                                    </div>
                                    <div class="askee-chat__info-element">
                                        <p>Działam wykorzystując</p>
                                        <button class="button button--ghost button--integrations">Integracje</button>
                                    </div>
                                    <div class="askee-chat__info-element">
                                        <p>Tworzę</p>
                                        <button class="button button--ghost button--reports-and-statements">Raporty i zestawienia</button>
                                    </div>
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

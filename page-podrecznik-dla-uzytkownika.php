<?php

get_header();
the_post();

?>

<div class="askee-chat askee-tickets askee-ticket-doc-page">
    <div class="container-fluid container-fluid--padding" data-askee-page="tickets" data-askee-topic="podrecznik-dla-uzytkownika">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box askee-ticket-doc">
                        <div class="askee-ticket-form__intro">
                            <p class="askee-ticket-form__intro-text">
                                Tu znajdziesz podręcznik użytkownika krok po kroku. Jeśli czegoś brakuje albo chcesz zgłosić problem, użyj
                                <a href="/zgloszenia/" style="font-size: 15px">formularza zgłoszenia</a>
                                — pomożemy Ci możliwie najszybciej.
                            </p>
                        </div>

                        <div class="askee-ticket-doc__content">
                            <?php

                            if (has_blocks(get_the_content()) || trim((string) get_the_content()) !== "") {
                                the_content();
                            } else {
                                echo '<p class="askee-ticket-doc__empty">Treść podręcznika nie została jeszcze dodana. Klient: uzupełnij stronę w wp-admin → Zgłoszenia → Podręcznik użytkownika.</p>';
                            }
                            ?>
                        </div>
                    </div>

                    <div class="askee-chat__buttons">
                        <a class="button button--light" href="/kontakt/" data-id="askee-chat-content-contact">Kontakt</a>
                        <a class="button button--light" href="/poznaj-mnie/" data-id="askee-chat-content-meet">Poznaj mnie</a>
                        <a class="button button--light" href="/obszary-wsparcia/" data-id="askee-chat-content-areas">Obszary wsparcia</a>
                        <a class="button button--light" href="/jak-moge-ci-pomoc/" data-id="askee-chat-content-help">Jak mogę Ci pomóc?</a>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-2 askee-chat__column askee-chat__column--right"><?php get_template_part("template-parts/sidebar"); ?></div>
        </div>
    </div>
</div>

<?php get_footer(); ?>

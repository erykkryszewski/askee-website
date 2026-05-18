<?php

/**
 * Template strony "Zgloszenia" — formularz ticketowy.
 *
 * Dostep: strona jest celowo NIELINKOWANA nigdzie w obrebie askee.app i ma
 * noindex (patrz askee_ticket_noindex_submission_page w ticket-system.php).
 * Jedyna droga wejscia to przejscie z aplikacji my.askee.app — zwykly
 * odwiedzajacy strone wizytowke nie powinien tu trafic.
 *
 * Aby strona byla dostepna pod /zgloszenia/:
 *  1. WP-admin -> Strony -> Dodaj nowa
 *  2. Tytul: "Zgloszenia"
 *  3. Slug: zgloszenia
 *  4. Template "Default" (WP rozpozna page-zgloszenia.php po slugu)
 *  5. Opublikuj
 */

get_header();
the_post();

$askee_ticket_honeypot_field_name = defined("ASKEE_TICKET_HONEYPOT_FIELD_NAME")
    ? ASKEE_TICKET_HONEYPOT_FIELD_NAME
    : "askee_website_url";

$askee_ticket_categories_map = function_exists("askee_ticket_get_categories_map")
    ? askee_ticket_get_categories_map()
    : [];

$askee_ticket_allowed_extensions_array = function_exists("askee_ticket_get_allowed_extensions_array")
    ? askee_ticket_get_allowed_extensions_array()
    : ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "txt"];

$askee_ticket_accept_attribute = "." . implode(",.", $askee_ticket_allowed_extensions_array);

$askee_ticket_max_count = defined("ASKEE_TICKET_ATTACHMENT_MAX_COUNT")
    ? (int) ASKEE_TICKET_ATTACHMENT_MAX_COUNT
    : 3;

$askee_ticket_max_size_mb = defined("ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE")
    ? (int) (ASKEE_TICKET_ATTACHMENT_MAX_BYTES_PER_FILE / 1024 / 1024)
    : 5;

// link do bazy wiedzy/instrukcji — pokazywany w intro formularza
$askee_ticket_knowledge_base_url = defined("ASKEE_TICKET_KNOWLEDGE_BASE_URL")
    ? ASKEE_TICKET_KNOWLEDGE_BASE_URL
    : "/faq/";

?>

<div class="askee-chat askee-contact askee-tickets">
    <div class="container-fluid container-fluid--padding" data-askee-page="tickets" data-askee-topic="zgloszenia">
        <div class="row">
            <div class="col-12 col-lg-8 offset-lg-2 askee-chat__column askee-chat__column--mid">
                <div class="askee-chat__wrapper">
                    <?php get_template_part("template-parts/title-rotator"); ?>

                    <div class="askee-chat__box">
                        <form class="askee-ticket-form" novalidate enctype="multipart/form-data">
                            <div class="askee-ticket-form__intro">
                                <p class="askee-ticket-form__intro-text">
                                    Wypełnij formularz, aby zgłosić sprawę. Po wysłaniu otrzymasz numer zgłoszenia — zachowaj go, jeśli będziesz chciał kontynuować temat w przyszłości. Zanim zgłosisz problem, sprawdź
                                    <a href="<?php echo esc_url($askee_ticket_knowledge_base_url); ?>" style="font-size: 15px">bazę wiedzy i instrukcje</a>
                                    — być może rozwiązanie jest już opisane.
                                </p>
                            </div>

                            <div class="askee-ticket-form__grid">
                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-name" class="askee-ticket-form__label">Imię i nazwisko</label>
                                    <input type="text" id="askee-ticket-name" name="name" class="askee-ticket-form__input" autocomplete="name" maxlength="120" required />
                                </div>

                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-email" class="askee-ticket-form__label">E-mail</label>
                                    <input type="email" id="askee-ticket-email" name="email" class="askee-ticket-form__input" autocomplete="email" maxlength="190" required />
                                </div>

                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-phone" class="askee-ticket-form__label">Telefon (opcjonalnie)</label>
                                    <input type="tel" id="askee-ticket-phone" name="phone" class="askee-ticket-form__input" autocomplete="tel" inputmode="tel" maxlength="32" />
                                </div>

                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-company" class="askee-ticket-form__label">Nazwa firmy</label>
                                    <input type="text" id="askee-ticket-company" name="company" class="askee-ticket-form__input" autocomplete="organization" maxlength="160" required />
                                </div>

                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-position" class="askee-ticket-form__label">Stanowisko</label>
                                    <input type="text" id="askee-ticket-position" name="position" class="askee-ticket-form__input" autocomplete="organization-title" maxlength="120" required />
                                </div>

                                <div class="askee-ticket-form__field">
                                    <label for="askee-ticket-category" class="askee-ticket-form__label">Kategoria</label>
                                    <select id="askee-ticket-category" name="category" class="askee-ticket-form__select" required>
                                        <option value="">— wybierz —</option>
                                        <?php foreach ($askee_ticket_categories_map as $askee_category_slug => $askee_category_label): ?>
                                            <option value="<?php echo esc_attr($askee_category_slug); ?>"><?php echo esc_html($askee_category_label); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <div class="askee-ticket-form__field askee-ticket-form__field--full">
                                    <label for="askee-ticket-previous-number" class="askee-ticket-form__label">Numer poprzedniego zgłoszenia (opcjonalnie)</label>
                                    <input type="text" id="askee-ticket-previous-number" name="previous_ticket_number" class="askee-ticket-form__input" placeholder="np. ASK-2026-0001" maxlength="32" />
                                </div>

                                <div class="askee-ticket-form__field askee-ticket-form__field--full">
                                    <label for="askee-ticket-message" class="askee-ticket-form__label">Treść zgłoszenia</label>
                                    <textarea id="askee-ticket-message" name="message" class="askee-ticket-form__textarea" rows="7" minlength="10" maxlength="6000" required></textarea>
                                </div>

                                <div class="askee-ticket-form__field askee-ticket-form__field--full">
                                    <label for="askee-ticket-attachments" class="askee-ticket-form__label">Załączniki (opcjonalnie, max <?php echo (int) $askee_ticket_max_count; ?> plików, do <?php echo (int) $askee_ticket_max_size_mb; ?> MB każdy)</label>
                                    <input type="file" id="askee-ticket-attachments" name="attachments[]" class="askee-ticket-form__file-input" multiple accept="<?php echo esc_attr($askee_ticket_accept_attribute); ?>" />
                                    <ul class="askee-ticket-form__file-list" aria-live="polite"></ul>
                                </div>

                                <div class="askee-ticket-form__field askee-ticket-form__field--checkbox">
                                    <input type="checkbox" id="askee-ticket-consent" name="consent" class="askee-ticket-form__checkbox" value="1" required />
                                    <label for="askee-ticket-consent" class="askee-ticket-form__label askee-ticket-form__label--checkbox">
                                        Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zgłoszenia zgodnie z
                                        <a href="/polityka-prywatnosci/">Polityką prywatności</a>
                                        .
                                    </label>
                                </div>

                                <div class="askee-ticket-form__field askee-ticket-form__field--honeypot" aria-hidden="true">
                                    <label for="<?php echo esc_attr($askee_ticket_honeypot_field_name); ?>">Adres www (nie wypełniaj)</label>
                                    <input type="text" id="<?php echo esc_attr($askee_ticket_honeypot_field_name); ?>" name="<?php echo esc_attr($askee_ticket_honeypot_field_name); ?>" autocomplete="off" tabindex="-1" />
                                </div>
                            </div>

                            <input type="hidden" name="form_loaded_at_timestamp" value="<?php echo esc_attr(time()); ?>" />

                            <p class="askee-ticket-form__status" aria-live="polite"></p>

                            <div class="askee-ticket-form__actions">
                                <button type="submit" class="askee-ticket-form__submit">Wyślij zgłoszenie</button>
                            </div>
                        </form>
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

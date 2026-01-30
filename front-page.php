<?php

get_header(); the_post();

?>

<div class="askee-homepage">
    <div class="container-fluid container-fluid--padding" data-askee-page="home">
        <div class="askee-homepage__wrapper">
            <div class="askee-homepage__slider">
                <div class="askee-homepage__item">
                    <div class="row">
                        <div class="col-12">
                            <div class="askee-homepage__welcome">
                                <h1>
                                    Cześć!
                                    <span>Jestem Twoim Asystentem Askee.</span>
                                </h1>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-lg-8 offset-lg-2">
                            <div class="askee-homepage__content">
                                <div class="askee-homepage__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                                <div class="askee-homepage__boxes">
                                    <div class="askee-homepage__box">
                                        <p>
                                            <strong>Pomagam w codziennej pracy.</strong>
                                            W jednym miejscu, bez przełączania się między systemami i aplikacjami.
                                        </p>
                                    </div>
                                    <div class="askee-homepage__box">
                                        <p>
                                            Wystarczy, że zadasz pytanie lub zlecisz zadanie – odpowiem albo zrobię to za Ciebie. Szybko, prosto i w sposób
                                            <strong>dopasowany do Twojej roli.</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="askee-homepage__item">
                    <div class="row">
                        <div class="col-12">
                            <div class="askee-homepage__welcome">
                                <h2>Dopasuję się do Twoich potrzeb!</h2>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-lg-8 offset-lg-2">
                            <div class="askee-homepage__content">
                                <div class="askee-homepage__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                                <div class="askee-homepage__boxes">
                                    <div class="askee-homepage__box">
                                        <p>
                                            <strong>Mogę wspierać Cię w różnych obszarach</strong>
                                            – wybierz, w czym mam Ci pomóc. Dopasuję się do Ciebie.
                                        </p>
                                    </div>
                                    <div class="askee-homepage__box">
                                        <p>
                                            Wspieram w sprawach kadrowych, rozwoju i ocenie pracowników, szybkim dostępie do wiedzy oraz zgodności z zasadami i procedurami firmy.
                                            <strong>Zawsze działam w oparciu o kontekst,</strong>
                                            rolę użytkownika i zasady Twojej organizacji.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="askee-homepage__item">
                    <div class="row">
                        <div class="col-12">
                            <div class="askee-homepage__welcome">
                                <h2>Zawsze jestem przy Tobie!</h2>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-lg-8 offset-lg-2">
                            <div class="askee-homepage__content">
                                <div class="askee-homepage__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                                <div class="askee-homepage__boxes">
                                    <div class="askee-homepage__box">
                                        <p>
                                            Jestem dostępny zawsze, gdy mnie potrzebujesz. Odpowiadam na pytania i wspieram Cię w pracy
                                            <strong>bez przerw i bez czekania.</strong>
                                        </p>
                                    </div>
                                    <div class="askee-homepage__box">
                                        <p>
                                            Możesz korzystać ze mnie w aplikacji ASKee oraz w narzędziach, których używasz na co dzień: na komputerze, tablecie, telefonie, w Teams, Slacku i innych systemach.
                                            <strong>Jestem zawsze pod ręką!</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="askee-homepage__item">
                    <div class="row">
                        <div class="col-12">
                            <div class="askee-homepage__welcome">
                                <h2>Twoje bezpieczeństwo to mój priorytet!</h2>
                            </div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-12 col-lg-8 offset-lg-2">
                            <div class="askee-homepage__content">
                                <div class="askee-homepage__image"><?php echo wp_get_attachment_image(5055, 'large'); ?></div>
                                <div class="askee-homepage__boxes">
                                    <div class="askee-homepage__box">
                                        <p>
                                            <strong>Nie wysyłam żadnych wrażliwych ani biznesowych danych</strong>
                                            do chmury publicznej.
                                        </p>
                                    </div>
                                    <div class="askee-homepage__box">
                                        <p>
                                            <strong>Anonimizuję i szyfruję wszystkie informacje,</strong>
                                            które mi powierzysz. Twoje dane są w pełni chronione – zawsze i wszędzie są dostępne
                                            <strong>wyłącznie między nami. </strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php get_footer(); ?>

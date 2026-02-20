
</main>

<footer class="footer <?php if (is_front_page()) { echo "footer--homepage"; } else { echo 'footer--subpage'; } ?>">
    <div class="container-fluid container-fluid--padding">
        <div class="footer__wrapper">
            <ul class="footer__nav">
                <li><a href="/o-nas">Poznaj nas</a></li>
                <li><a href="/nasza-filozofia">Nasza filozofia</a></li>
                <li><a href="/kontakt">Kontakt z nami</a></li>
            </ul>
            <p class="text-small text-light">Rozpoczęcie rozmowy z Askee oznacza zgodę na nasz <a href="/regulamin">Regulamin</a> oraz zapoznanie się z naszymi <a href="/polityka-prywatnosci">Polityką Prywatności</a>. Zobacz <a href="/preferencje-plikow-cookie">Preferencje dotyczące plików cookie</a>. Askee 2026 </p>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>

</body>
</html>

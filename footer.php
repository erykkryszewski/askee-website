
<footer class="footer <?php if (is_front_page()) { echo "footer--homepage"; } ?>">
    <div class="container">
        <div class="footer__wrapper">

        </div>
    </div>

    <div class="bottom-bar">
        <div class="container">
            <div class="bottom-bar__wrapper">
                <p>
                    <?php _e("Copyright", "askeetheme"); ?>
                    © <?php echo date("Y"); ?>&nbsp;<?php _e("Askee", "askeetheme"); ?>
                </p>
                <p>
                    Strona stworzona przez
                    <a href="https://wise-group.com/" target="_blank">Wise Group</a>
                </p>
            </div>
        </div>
    </div>
</footer>

</body>
</html>

<?php wp_footer(); ?>

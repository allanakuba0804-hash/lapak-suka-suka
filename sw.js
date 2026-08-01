self.addEventListener("activate", function (event) {
    event.waitUntil(
        self.clients.claim()
    );
});
self.addEventListener("push", function (event) {

    console.log("🔔 PUSH DITERIMA");

    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch (error) {
        console.error("Gagal membaca push:", error);
    }
    console.log("📦 DATA PUSH:", data);
    const title =
        data.title || "Lapak Suka Suka";

    const options = {

        body:
            data.body ||
            "Ada pesanan baru!",

        icon:
            data.icon ||
            "/icon-192.png",

        badge:
            data.badge ||
            "/icon-192.png",

        tag:
            "lapak-suka-suka-order",

        renotify: true,

        data: {
            url:
                "https://allanakuba0804-hash.github.io/lapak-suka-suka/admin.html"
        }
    };

    event.waitUntil(

        self.registration.showNotification(
            title,
            options
        )

    );

});


self.addEventListener(
    "notificationclick",
    function (event) {

        event.notification.close();

        const adminUrl =
            "https://allanakuba0804-hash.github.io/lapak-suka-suka/admin.html";

        console.log(
            "🔗 MEMBUKA ADMIN ONLINE:",
            adminUrl
        );

        event.waitUntil(

            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then(function (clientList) {

                for (const client of clientList) {

                    if (
                        client.url.includes("/lapak-suka-suka/admin.html") &&
                        "focus" in client
                    ) {
                        return client.focus();
                    }
                }

                if (clients.openWindow) {
                    return clients.openWindow(adminUrl);
                }

            })

        );

    }
);
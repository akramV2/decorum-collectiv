/* Shared public editorial features; existing Firebase articles remain readable during rollout. */
window.Decorum = (() => {
  let readiness;
  async function ready() {
    if (!readiness)
      readiness = fetch("/api/editorial?action=health")
        .then((r) => (r.ok ? r.json() : { ready: false }))
        .catch(() => ({ ready: false }));
    return readiness;
  }
  async function api(action, { body, admin = false, params = {} } = {}) {
    const headers = {};
    if (admin) {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Connectez-vous à la rédaction.");
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    }
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(
      `/api/editorial?${new URLSearchParams({ action, ...params })}`,
      {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Service momentanément indisponible.");
    }
    if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
    return data;
  }
  const TECH = {
    architect: "Architecte",
    project: "Projet",
    year: "Année",
    city: "Lieu",
    country: "Pays",
    materials: "Matériaux",
    height: "Hauteur",
    area: "Surface",
    program: "Programme",
  };
  const VISIT = {
    address: "Adresse",
    hours: "Horaires",
    prices: "Tarifs",
    transport: "Accès / transports",
    website: "Site officiel",
  };
  function section(id, title, values, labels, after) {
    document.getElementById(id)?.remove();
    const pairs = Object.entries(labels).filter(([k]) =>
      String(values?.[k] ?? "").trim(),
    );
    if (!pairs.length) return;
    const box = document.createElement("section");
    box.id = id;
    box.className = "editorial-facts";
    const h = document.createElement("h2");
    h.textContent = title;
    box.append(h);
    const dl = document.createElement("dl");
    for (const [k, label] of pairs) {
      const row = document.createElement("div"),
        dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      if (k === "website" && /^https?:\/\//i.test(values[k])) {
        const link = document.createElement("a");
        link.href = values[k];
        link.textContent = "Consulter le site officiel ↗";
        link.rel = "noopener noreferrer";
        link.target = "_blank";
        dd.append(link);
      } else dd.textContent = values[k];
      row.append(dt, dd);
      dl.append(row);
    }
    box.append(dl);
    after?.after(box);
    return box;
  }
  async function enrichArticle(a, id) {
    section(
      "technical-sheet",
      "Fiche technique",
      a.technical,
      TECH,
      document.getElementById("art-excerpt"),
    );
    const visit = section(
      "visit-information",
      "Préparer la visite",
      a.visit,
      VISIT,
      document.getElementById("art-content"),
    );
    if (a.visit?.lat != null && a.visit?.lng != null) {
      const link = document.createElement("a");
      link.className = "btn-link";
      link.textContent = "Voir sur la Carte DECORUM →";
      link.href = `index.html?lat=${encodeURIComponent(a.visit.lat)}&lng=${encodeURIComponent(a.visit.lng)}#carte`;
      (visit || document.getElementById("art-content")).append(link);
    }
    const wrapper = document.getElementById("art-image-wrapper");
    if (wrapper?.querySelector("img")) {
      wrapper.querySelector("img").alt = a.imageAlt || a.title;
    }
    if (a.imageCredit && wrapper) {
      const credit = document.createElement("p");
      credit.className = "image-credit";
      credit.textContent = a.imageCredit;
      wrapper.append(credit);
    }
    if ((await ready()).pdf) {
      const actions = document.getElementById("reader-actions");
      if (actions) {
        actions.hidden = false;
        const pdf = actions.querySelector("a");
        pdf.href = `/api/editorial?action=pdf&id=${encodeURIComponent(id)}`;
      }
    }
  }
  async function countdown() {
    const box = document.getElementById("next-publication");
    if (!box || !(await ready()).ready) return;
    try {
      const config = await api("countdown");
      if (!config.enabled || !config.publishAt) return;
      box.hidden = false;
      box.querySelector("h2").textContent = config.title;
      box.querySelector("p").textContent = config.teaser;
      const time = box.querySelector("time");
      time.dateTime = config.publishAt;
      time.textContent =
        new Date(config.publishAt).toLocaleString("fr-FR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/Paris",
        }) + " · Paris";
      const offset = Date.parse(config.serverTime) - Date.now(),
        output = box.querySelector("[data-countdown]");
      let timer;
      const tick = () => {
        const seconds = Math.max(
          0,
          Math.floor(
            (Date.parse(config.publishAt) - Date.now() - offset) / 1000,
          ),
        );
        if (seconds === 0) {
          output.textContent = config.available
            ? "L’article est paru"
            : "Publication imminente";
          if (config.available && config.articleId) {
            const a = document.createElement("a");
            a.className = "btn-link";
            a.href = `article.html?id=${encodeURIComponent(config.articleId)}`;
            a.textContent = "Lire l’article →";
            output.replaceChildren(a);
          }
          clearInterval(timer);
          return;
        }
        const days = Math.floor(seconds / 86400),
          h = Math.floor((seconds % 86400) / 3600),
          m = Math.floor((seconds % 3600) / 60),
          s = seconds % 60;
        output.textContent = `${days} j · ${String(h).padStart(2, "0")} h · ${String(m).padStart(2, "0")} min · ${String(s).padStart(2, "0")} s`;
      };
      tick();
      if (Date.parse(config.publishAt) > Date.now() + offset) {
        timer = setInterval(tick, 1000);
        setTimeout(
          () => {
            clearInterval(timer);
            countdown();
          },
          Math.min(
            2147483647,
            Math.max(
              1000,
              Date.parse(config.publishAt) - Date.now() - offset + 1500,
            ),
          ),
        );
      }
    } catch {
      box.hidden = true;
    }
  }
  async function places(map, icon) {
    const params = new URLSearchParams(location.search),
      lat = Number(params.get("lat")),
      lng = Number(params.get("lng"));
    if (
      params.has("lat") &&
      params.has("lng") &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      map.setView([lat, lng], 15);
      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup("Lieu de votre article");
    }
    if (!(await ready()).ready) return false;
    try {
      const { items } = await api("places");
      const list = document.getElementById("places-list");
      items.forEach((place) => {
        const card = document.createElement("article");
        card.className = "place-card";
        const title = document.createElement("h3");
        title.textContent = place.name;
        const p = document.createElement("p");
        p.textContent = [place.city, place.country, place.architect]
          .filter(Boolean)
          .join(" · ");
        card.append(title, p);
        if (place.description) {
          const desc = document.createElement("p");
          desc.textContent = place.description;
          card.append(desc);
        }
        if (place.articleId) {
          const link = document.createElement("a");
          link.href = `article.html?id=${encodeURIComponent(place.articleId)}`;
          link.textContent = "Lire l’article →";
          card.append(link);
        }
        list?.append(card);
        if (Number.isFinite(place.lat) && Number.isFinite(place.lng))
          L.marker([place.lat, place.lng], { icon, title: place.name })
            .addTo(map)
            .bindPopup(card.cloneNode(true));
      });
      return true;
    } catch {
      return false; /* Keep the existing map available during transient outages. */
    }
  }
  async function proposal() {
    const form = document.getElementById("proposal-form");
    if (!form) return;
    const status = document.getElementById("proposal-status");
    const health = await ready();
    if (!health.ready || !health.submissions) {
      status.textContent =
        "Le formulaire est en cours d’activation. Vous pouvez proposer un lieu à decorumcollectiv@gmail.com.";
      form.querySelector("button").disabled = true;
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const values = Object.fromEntries(new FormData(form));
        const file = form.elements.photo.files[0];
        delete values.photo;
        if (file?.size) {
          if (
            file.size > 500 * 1024 ||
            !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
              file.type,
            )
          )
            throw new Error("Image JPEG, PNG, WebP ou AVIF de 500 Ko maximum.");
          values.image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
        await api("submit", { body: values });
        form.reset();
        status.textContent =
          "Merci ! Votre proposition a été transmise à la rédaction.";
      } catch (e) {
        status.textContent = e.message;
      } finally {
        btn.disabled = false;
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    countdown();
    proposal();
  });
  return { api, ready, TECH, VISIT, enrichArticle, places };
})();

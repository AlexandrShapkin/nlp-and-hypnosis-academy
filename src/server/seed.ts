import { sqlite } from "@/db";
import {
  defaultTheme,
  settingsSchema,
  pageSchema,
  cardSchema,
  type Block,
} from "@/shared/content";
import { saveEntity, publishEntity } from "./store";
export function seed() {
  sqlite.transaction(() => {
    const settings = settingsSchema.parse({
      siteTitle: "Академия НЛП и гипноза",
      brandLabel: "АКАДЕМИЯ · НЛП И ГИПНОЗ",
      description:
        "Пространство для знакомства с практиками самопознания, обучения и осознанных изменений.",
      phone: "",
      email: "",
      bookingLabel: "Задать вопрос",
      bookingUrl: "/#contact",
      footerText: "Внимание к себе. Интерес к возможностям.",
      legalText:
        "Информация на сайте носит ознакомительный характер и не заменяет индивидуальную консультацию.",
      privacyVersion: "1",
      socialUrl: "",
      seo: {
        title: "Академия НЛП и гипноза — пространство осознанных изменений",
        description:
          "Знакомство с подходами к обучению, самопознанию и личному развитию.",
        noindex: false,
      },
    });
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO settings(id,version,payload) VALUES(?,?,?)",
      )
      .run("site", 1, JSON.stringify(settings));
    sqlite
      .prepare(
        "INSERT OR IGNORE INTO theme(id,version,draft,published) VALUES(?,?,?,?)",
      )
      .run(
        "site",
        1,
        JSON.stringify(defaultTheme),
        JSON.stringify(defaultTheme),
      );
    sqlite
      .prepare("INSERT OR IGNORE INTO theme_history(id,tokens) VALUES(?,?)")
      .run("initial", JSON.stringify(defaultTheme));
    const block = (
      id: string,
      type: Block["type"],
      heading: string,
      body: string,
      data: Block["data"] = {},
    ): Block => ({
      id,
      key: id,
      type,
      heading,
      body,
      visible: true,
      variant: "default",
      data,
    });
    const sections = [
      block(
        "hero",
        "hero",
        "Новые возможности начинаются с внимания к себе",
        "Знакомьтесь с подходами к самопознанию и обучению. Исследуйте то, что важно именно вам.",
        { ctaLabel: "Узнать больше", ctaUrl: "/#about" },
      ),
      block("stats", "metrics", "В основе нашего подхода", "", {
        intro: "Открытый диалог, внимательное отношение и осознанный выбор.",
      }),
      block(
        "about",
        "about",
        "Пространство для знакомства и диалога",
        "Академия объединяет интерес к развитию, коммуникации и осознанным изменениям. Здесь можно познакомиться с направлениями работы и задать свой вопрос.",
      ),
      block(
        "areas",
        "card_grid",
        "С чего можно начать",
        "Выберите тему, которая откликается вам.",
        {
          emptyMessage:
            "Расскажите, что для вас важно, — начнём с вашего вопроса.",
        },
      ),
      block(
        "services",
        "service_list",
        "Форматы взаимодействия",
        "Подходящий формат и условия обсуждаются индивидуально.",
        { emptyMessage: "Уточнить доступные форматы можно через форму ниже." },
      ),
      block(
        "testimonials",
        "testimonials",
        "Опыт участников",
        "Обратная связь помогает лучше понимать потребности людей.",
        { emptyMessage: "Мы публикуем отзывы только с согласия их авторов." },
      ),
      block(
        "contact",
        "contact_form",
        "Давайте начнём с вопроса",
        "Оставьте сообщение, чтобы обсудить интересующую вас тему.",
        {
          nameLabel: "Ваше имя",
          phoneLabel: "Телефон",
          emailLabel: "Электронная почта",
          messageLabel: "Ваш вопрос",
          privacyLabel:
            "Я ознакомлен(а) с политикой конфиденциальности и согласен(на) на обработку данных",
          marketingLabel: "Я хочу получать информационные сообщения",
          submitLabel: "Отправить вопрос",
          successMessage: "Спасибо! Ваш вопрос отправлен.",
        },
      ),
      block(
        "footer",
        "footer",
        "Оставайтесь в контакте",
        "Внимание к себе. Интерес к возможностям.",
      ),
    ];
    function entity(kind: "card" | "page", id: string, input: unknown) {
      if (sqlite.prepare("SELECT id FROM entities WHERE id=?").get(id)) return;
      const draft = (kind === "card" ? cardSchema : pageSchema).parse(input);
      const e = saveEntity(kind, draft);
      publishEntity(kind, e.id, e.version);
      /* Stable seed key stored separately to preserve idempotence. */ sqlite
        .prepare("INSERT OR IGNORE INTO seed_keys(key,entity_id) VALUES(?,?)")
        .run(id, e.id);
    }
    sqlite.exec(
      "CREATE TABLE IF NOT EXISTS seed_keys(key TEXT PRIMARY KEY,entity_id TEXT NOT NULL REFERENCES entities(id))",
    );
    function once(kind: "card" | "page", key: string, input: unknown) {
      if (sqlite.prepare("SELECT key FROM seed_keys WHERE key=?").get(key))
        return;
      entity(kind, key, input);
    }
    once("page", "privacy", {
      slug: "privacy",
      title: "Конфиденциальность",
      body: "Данные из формы используются для ответа на ваше обращение. Обязательное согласие на обработку данных и добровольная подписка учитываются отдельно. Для вопросов об обработке и удалении данных обратитесь к владельцу сайта через форму связи.",
      showInNavigation: true,
      navigationGroup: "footer",
      seo: { title: "Конфиденциальность", noindex: false },
    });
    once("page", "terms", {
      slug: "terms",
      title: "Условия использования",
      body: "Материалы сайта предназначены для ознакомления. Условия участия, стоимость и доступность форматов согласовываются индивидуально. Сайт не предназначен для экстренной помощи.",
      showInNavigation: true,
      navigationGroup: "footer",
      seo: { title: "Условия использования", noindex: false },
    });
    once("page", "home", {
      slug: "home",
      title: "Академия НЛП и гипноза",
      sections,
      seo: settings.seo,
    });
    once("card", "intro-topic", {
      type: "topic",
      slug: "osoznannoe-obuchenie",
      title: "Осознанное обучение",
      summary:
        "Знакомство с новыми подходами начинается с любопытства и вопросов.",
      body: "Исследуйте способы учиться, замечать привычные реакции и формулировать собственные цели. Задайте вопрос, если хотите обсудить доступные форматы.",
      sectionId: "areas",
      showInNavigation: true,
      seo: {
        title: "Осознанное обучение — Академия НЛП и гипноза",
        description: "Знакомство с подходами к обучению и самопознанию.",
        noindex: false,
      },
    });
    for (const [key, title, summary] of [
      ["dialog", "Диалог", "Начинаем с ваших вопросов и ожиданий."],
      ["choice", "Выбор", "Вы определяете комфортный темп и направление."],
      ["attention", "Внимание", "Замечаем то, что важно для вашего обучения."],
    ])
      once("card", `principle-${key}`, {
        type: "metric",
        slug: `principle-${key}`,
        title,
        summary,
        sectionId: "stats",
        showInNavigation: false,
        seo: { noindex: true },
      });
    for (const [i, key, label] of [
      ["0", "about", "Об академии"],
      ["1", "areas", "Направления"],
      ["2", "services", "Форматы"],
      ["3", "contact", "Контакты"],
    ]) {
      const n = {
        id: `seed-${key}`,
        label,
        href: `/#${key}`,
        group: "primary",
        order: Number(i),
        visible: true,
        target: { kind: "section", id: key },
      };
      sqlite
        .prepare("INSERT OR IGNORE INTO navigation(id,payload) VALUES(?,?)")
        .run(n.id, JSON.stringify(n));
    }
  })();
}

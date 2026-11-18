import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, index, unique, bigint, char, decimal, datetime, date, text, foreignKey, mediumtext, tinyint, mysqlEnum, longtext, float, double, smallint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const admins = mysqlTable("admins", {
	id: int().autoincrement().notNull(),
	login: varchar({ length: 50 }).default("").notNull(),
	password: varchar({ length: 255 }).default("").notNull(),
	adminType: int("admin_type").default(2).notNull(),
	status: int().default(1).notNull(),
	sorder: int().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "admins_id"}),
]);

export const adminSessions = mysqlTable("admin_sessions", {
	tokenHash: char("token_hash", { length: 64 }).notNull(),
	adminId: int("admin_id").notNull(),
	expiresAt: datetime("expires_at", { mode: 'string'}).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
}, (table) => [
	primaryKey({ columns: [table.tokenHash], name: "admin_sessions_token_hash"}),
	index("admin_sessions_admin_id").on(table.adminId),
	index("admin_sessions_expires_at").on(table.expiresAt),
]);

export const adminLoginAttempts = mysqlTable("admin_login_attempts", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	attemptKey: char("attempt_key", { length: 64 }).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
}, (table) => [
	primaryKey({ columns: [table.id], name: "admin_login_attempts_id"}),
	index("admin_login_attempts_key_created").on(table.attemptKey, table.createdAt),
	index("admin_login_attempts_created_at").on(table.createdAt),
]);

export const analyticsEvents = mysqlTable("analytics_events", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	eventUid: char("event_uid", { length: 36 }).notNull(),
	eventName: varchar("event_name", { length: 40 }).notNull(),
	visitorKey: char("visitor_key", { length: 64 }).notNull(),
	sessionKey: char("session_key", { length: 64 }).notNull(),
	cartKey: char("cart_key", { length: 64 }),
	productId: int("product_id"),
	categoryId: int("category_id"),
	orderId: int("order_id"),
	quantity: int({ unsigned: true }),
	cartItemsCount: int("cart_items_count", { unsigned: true }),
	cartValue: decimal("cart_value", { precision: 12, scale: 2 }),
	eventValue: decimal("event_value", { precision: 12, scale: 2 }),
	currency: char({ length: 3 }),
	pagePath: varchar("page_path", { length: 255 }),
	trafficSource: varchar("traffic_source", { length: 80 }),
	trafficMedium: varchar("traffic_medium", { length: 80 }),
	trafficCampaign: varchar("traffic_campaign", { length: 120 }),
	referrerHost: varchar("referrer_host", { length: 191 }),
	deviceType: varchar("device_type", { length: 16 }),
	consentVersion: varchar("consent_version", { length: 32 }).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_analytics_events_name_created").on(table.eventName, table.createdAt),
	index("idx_analytics_events_visitor_created").on(table.visitorKey, table.createdAt),
	index("idx_analytics_events_session_created").on(table.sessionKey, table.createdAt),
	index("idx_analytics_events_cart_created").on(table.cartKey, table.createdAt),
	index("idx_analytics_events_product_created").on(table.productId, table.createdAt),
	index("idx_analytics_events_category_created").on(table.categoryId, table.createdAt),
	index("idx_analytics_events_order").on(table.orderId),
	index("idx_analytics_events_source_created").on(table.trafficSource, table.createdAt),
	index("idx_analytics_events_device_created").on(table.deviceType, table.createdAt),
	primaryKey({ columns: [table.id], name: "analytics_events_id"}),
	unique("uq_analytics_events_event_uid").on(table.eventUid),
]);

export const articleLikes = mysqlTable("article_likes", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	articleId: int("article_id").notNull(),
	visitorKey: char("visitor_key", { length: 64 }).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_article_likes_article").on(table.articleId),
	primaryKey({ columns: [table.id], name: "article_likes_id"}),
	unique("uq_article_likes_visitor").on(table.articleId, table.visitorKey),
]);

export const articles = mysqlTable("articles", {
	id: int().autoincrement().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	date: date({ mode: 'string' }).notNull(),
	uriRu: varchar({ length: 300 }).notNull(),
	uriRo: varchar({ length: 300 }).notNull(),
	uriEn: varchar({ length: 300 }).notNull(),
	titleRu: varchar({ length: 250 }),
	titleRo: varchar({ length: 250 }),
	titleEn: varchar({ length: 255 }),
	descRu: text().notNull(),
	descRo: text().notNull(),
	descEn: text().notNull(),
	textRu: text(),
	textRo: text(),
	textEn: text(),
	textLru: text(),
	textLro: text(),
	textLen: text(),
	seoTitleRu: varchar({ length: 250 }),
	seoTitleRo: varchar({ length: 250 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	tagsRu: varchar({ length: 500 }).default("").notNull(),
	seoDescRo: text(),
	tagsRo: varchar({ length: 500 }).default("").notNull(),
	seoDescEn: text(),
	menuOn: int().notNull(),
	isShown: tinyint().default(1).notNull(),
	isBlog: tinyint().default(0).notNull(),
	sorder: int().default(1).notNull(),
	img: varchar({ length: 255 }),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "articles_id"}),
]);

export const banners = mysqlTable("banners", {
	id: int().autoincrement().notNull(),
	titleRu: varchar({ length: 250 }),
	titleRo: varchar({ length: 250 }),
	titleEn: varchar({ length: 255 }),
	uriRu: varchar({ length: 300 }).notNull(),
	uriRo: varchar({ length: 300 }).notNull(),
	uriEn: varchar({ length: 300 }).notNull(),
	colorText: varchar("ColorText", { length: 32 }).notNull(),
	colorButton: varchar("ColorButton", { length: 32 }).notNull(),
	colorButtonText: varchar("ColorButtonText", { length: 32 }).notNull(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(1).notNull(),
	img: varchar({ length: 255 }),
	imgMob: varchar({ length: 254 }).notNull(),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "banners_id"}),
]);

export const beautySelectionProducts = mysqlTable("beauty_selection_products", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	selectionId: int("selection_id", { unsigned: true }).notNull().references(() => beautySelections.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	productId: int("product_id").notNull(),
	sorder: int().default(0).notNull(),
},
(table) => [
	index("idx_beauty_selection_products_order").on(table.selectionId, table.sorder, table.id),
	primaryKey({ columns: [table.id], name: "beauty_selection_products_id"}),
	unique("uniq_beauty_selection_product").on(table.selectionId, table.productId),
]);

export const beautySelections = mysqlTable("beauty_selections", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	uriRu: varchar({ length: 255 }).notNull(),
	uriRo: varchar({ length: 255 }).notNull(),
	descRu: text(),
	descRo: text(),
	textRu: mediumtext(),
	textRo: mediumtext(),
	imgRu: varchar({ length: 255 }),
	imgRo: varchar({ length: 255 }),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(0).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	index("idx_beauty_selections_visibility_order").on(table.isShown, table.sorder, table.id),
	primaryKey({ columns: [table.id], name: "beauty_selections_id"}),
	unique("uniq_beauty_selections_uri_ru").on(table.uriRu),
	unique("uniq_beauty_selections_uri_ro").on(table.uriRo),
]);

export const brandCertificates = mysqlTable("brand_certificates", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	brandId: int("brand_id", { unsigned: true }).notNull(),
	titleRu: varchar({ length: 255 }),
	titleRo: varchar({ length: 255 }),
	image: varchar({ length: 255 }).notNull(),
	previewImage: varchar("preview_image", { length: 255 }),
	sorder: int().default(0).notNull(),
	isShown: tinyint().default(1).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	index("idx_brand_certificates_brand").on(table.brandId),
	index("idx_brand_certificates_visible_order").on(table.brandId, table.isShown, table.sorder),
	primaryKey({ columns: [table.id], name: "brand_certificates_id"}),
]);

export const brands = mysqlTable("brands", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	title: varchar({ length: 256 }),
	h1Ro: varchar({ length: 255 }),
	h1Ru: varchar({ length: 255 }),
	breadcrumbTitleRo: varchar({ length: 255 }),
	breadcrumbTitleRu: varchar({ length: 255 }),
	uri: varchar({ length: 256 }),
	textRu: text().notNull(),
	textRo: text().notNull(),
	textEn: text().notNull(),
	img: varchar({ length: 256 }),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	seoTextRo: mediumtext(),
	seoTextRu: mediumtext(),
	seoDescEn: text(),
	sorder: int().default(0),
	top: int().notNull(),
	isShown: tinyint().default(1),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("id").on(table.id),
	primaryKey({ columns: [table.id], name: "brands_id"}),
]);

export const categories = mysqlTable("categories", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	parentId: int("parent_id").default(0).notNull(),
	featureType: int("feature_type").notNull(),
	step: int().notNull(),
	titleRu: varchar({ length: 256 }),
	h1Ru: varchar({ length: 255 }),
	breadcrumbTitleRu: varchar({ length: 255 }),
	titleRo: varchar({ length: 256 }),
	h1Ro: varchar({ length: 255 }),
	breadcrumbTitleRo: varchar({ length: 255 }),
	titleEn: varchar({ length: 256 }),
	uriRu: varchar({ length: 256 }),
	uriRo: varchar({ length: 256 }),
	uriEn: varchar({ length: 256 }),
	img: varchar({ length: 256 }),
	imgNav: varchar({ length: 254 }).notNull(),
	imgNavHover: varchar({ length: 254 }).notNull(),
	calculator: int().notNull(),
	searchTeg: varchar("search_teg", { length: 255 }).notNull(),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoTitleEn: varchar({ length: 255 }),
	descRu: text().notNull(),
	descRo: text().notNull(),
	descEn: text().notNull(),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoTextRu: mediumtext(),
	seoDescRo: text(),
	seoTextRo: mediumtext(),
	seoDescEn: text(),
	topMenu: int("top_menu").notNull(),
	footerMenu: int("footer_menu").notNull(),
	sorder: int().default(0),
	wallpaper: int().notNull(),
	isShown: tinyint().default(1),
	isCustomMobile: tinyint().default(0).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "categories_id"}),
]);

export const categoryBanner = mysqlTable("category_banner", {
	id: int().autoincrement().notNull(),
	categoryId: int("category_id").notNull(),
	titleRu: varchar({ length: 256 }),
	titleRo: varchar({ length: 256 }),
	titleEn: varchar({ length: 256 }),
	uriRu: varchar({ length: 256 }),
	uriRo: varchar({ length: 256 }),
	uriEn: varchar({ length: 256 }),
	descRu: varchar({ length: 256 }),
	descRo: varchar({ length: 256 }),
	descEn: varchar({ length: 256 }),
	img: varchar({ length: 256 }),
	sorder: int().default(0),
	isShown: tinyint().default(1),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("category_id").on(table.categoryId),
	index("idx_category_banner_category_id_id").on(table.categoryId, table.id),
	primaryKey({ columns: [table.id], name: "category_banner_id"}),
]);

export const clients = mysqlTable("clients", {
	id: int().autoincrement().notNull(),
	idFb: int("id_fb").notNull(),
	active: int().notNull(),
	discount: varchar("Discount", { length: 16 }).notNull(),
	bonus: varchar("Bonus", { length: 16 }).notNull(),
	name: varchar({ length: 255 }).default('0').notNull(),
	surname: varchar({ length: 256 }),
	phone: varchar({ length: 256 }),
	email: text(),
	address: varchar({ length: 254 }),
	apartament: varchar({ length: 64 }),
	city: varchar({ length: 64 }),
	house: varchar({ length: 64 }),
	porch: varchar({ length: 64 }),
	birthday: varchar({ length: 256 }),
	sex: int().notNull(),
	password: varchar({ length: 256 }),
	code: int().notNull(),
	smsSubscribe: int("sms_subscribe").notNull(),
	mailSubscribe: int("mail_subscribe").notNull(),
	sorder: int().default(0),
	isShown: tinyint().default(1),
	isb2B: tinyint().default(0).notNull(),
	isCreator: tinyint("is_creator").default(0).notNull(),
	welcomeOfferStartedAt: datetime("welcome_offer_started_at", { mode: 'string'}),
	welcomeOfferExpiresAt: datetime("welcome_offer_expires_at", { mode: 'string'}),
},
(table) => [
	index("id_fb").on(table.idFb),
	index("active").on(table.active),
	index("phone").on(table.phone),
	index("code").on(table.code),
	primaryKey({ columns: [table.id], name: "clients_id"}),
]);

export const personalDataRequests = mysqlTable("personal_data_requests", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	clientId: int("client_id", { unsigned: true }),
	requestType: varchar("request_type", { length: 32 }).notNull(),
	details: text().notNull(),
	source: varchar({ length: 40 }).default("account").notNull(),
	status: varchar({ length: 24 }).default("new").notNull(),
	identityVerified: tinyint("identity_verified", { unsigned: true }).default(1).notNull(),
	adminNote: text("admin_note"),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	processedAt: datetime("processed_at", { mode: 'string'}),
}, (table) => [
	index("idx_privacy_client_status").on(table.clientId, table.status),
	index("idx_privacy_created_at").on(table.createdAt),
	primaryKey({ columns: [table.id], name: "personal_data_requests_id"}),
]);

export const wishlistItems = mysqlTable("wishlist_items", {
	id: int().autoincrement().notNull(),
	contactId: int("contact_id").notNull(),
	productId: int("product_id").notNull(),
},
(table) => [
	unique("wishlist_items_contact_product").on(table.contactId, table.productId),
	index("wishlist_items_contact_id").on(table.contactId),
	index("wishlist_items_product_id").on(table.productId),
	primaryKey({ columns: [table.id], name: "wishlist_items_id"}),
]);

export const authSessions = mysqlTable("auth_sessions", {
	tokenHash: char("token_hash", { length: 64 }).notNull(),
	clientId: int("client_id").notNull(),
	expiresAt: datetime("expires_at", { mode: 'string' }).notNull(),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.tokenHash], name: "auth_sessions_token_hash" }),
	index("auth_sessions_client_id").on(table.clientId),
	index("auth_sessions_expires_at").on(table.expiresAt),
]);

export const authVerificationCodes = mysqlTable("auth_verification_codes", {
	id: int().autoincrement().notNull(),
	clientId: int("client_id").notNull(),
	purpose: varchar({ length: 32 }).notNull(),
	codeHash: char("code_hash", { length: 64 }).notNull(),
	attemptCount: int("attempt_count", { unsigned: true }).default(0).notNull(),
	expiresAt: datetime("expires_at", { mode: 'string' }).notNull(),
	usedAt: datetime("used_at", { mode: 'string' }),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "auth_verification_codes_id" }),
	index("auth_verification_codes_client_id").on(table.clientId),
	index("auth_verification_codes_expiry").on(table.expiresAt),
]);

export const authPasswordResetTokens = mysqlTable("auth_password_reset_tokens", {
	tokenHash: char("token_hash", { length: 64 }).notNull(),
	clientId: int("client_id").notNull(),
	expiresAt: datetime("expires_at", { mode: 'string' }).notNull(),
	usedAt: datetime("used_at", { mode: 'string' }),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.tokenHash], name: "auth_password_reset_tokens_token_hash" }),
	index("auth_password_reset_tokens_client_id").on(table.clientId),
	index("auth_password_reset_tokens_expiry").on(table.expiresAt),
]);

export const collections = mysqlTable("collections", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	brandId: int("brand_id").notNull(),
	titleRu: varchar({ length: 256 }),
	titleRo: varchar({ length: 256 }),
	titleEn: varchar({ length: 256 }),
	uriRu: varchar({ length: 256 }),
	uriRo: varchar({ length: 256 }),
	uriEn: varchar({ length: 256 }),
	descRu: varchar({ length: 256 }),
	descRo: varchar({ length: 256 }),
	descEn: varchar({ length: 256 }),
	img: varchar({ length: 256 }),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	seoDescEn: text(),
	sorder: int().default(0),
	top: int().notNull(),
	isShown: tinyint().default(1),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "collections_id"}),
]);

export const constants = mysqlTable("constants", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 250 }),
	description: varchar({ length: 250 }),
	en: text("EN"),
	ro: text("RO").notNull(),
	ru: text("RU"),
	fieldType: tinyint().default(0).notNull(),
	groupes: mysqlEnum(['errors','transliteration','contacts','form','choose','about','dates']).notNull(),
	sorder: int().default(999).notNull(),
	isShown: int().default(1).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "constants_id"}),
	unique("ID").on(table.id),
]);

export const dates = mysqlTable("dates", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateStart: date("date_start", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateEnd: date("date_end", { mode: 'string' }),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "dates_id"}),
]);

export const delivery = mysqlTable("delivery", {
	id: int().autoincrement().notNull(),
	title1Ru: varchar({ length: 250 }),
	title1Ro: varchar({ length: 250 }),
	descL1Ru: text().notNull(),
	descL1Ro: text().notNull(),
	descR1Ru: text().notNull(),
	descR1Ro: text().notNull(),
	note1Ru: text().notNull(),
	note1Ro: text().notNull(),
	text1Ru: text().notNull(),
	text1Ro: text().notNull(),
	title2Ru: varchar({ length: 250 }),
	title2Ro: varchar({ length: 250 }),
	descL2Ru: text().notNull(),
	descL2Ro: text().notNull(),
	descR2Ru: text().notNull(),
	descR2Ro: text().notNull(),
	title3Ru: varchar({ length: 250 }),
	title3Ro: varchar({ length: 250 }),
	descL3Ru: text().notNull(),
	descL3Ro: text().notNull(),
	descR3Ru: text().notNull(),
	descR3Ro: text().notNull(),
	title4Ru: varchar({ length: 250 }),
	title4Ro: varchar({ length: 250 }),
	descL4Ru: text().notNull(),
	descL4Ro: text().notNull(),
	descR4Ru: text().notNull(),
	descR4Ro: text().notNull(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(1).notNull(),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "delivery_id"}),
]);

export const giftPromotionBrands = mysqlTable("gift_promotion_brands", {
	promotionId: int("promotion_id", { unsigned: true }).notNull(),
	brandId: int("brand_id", { unsigned: true }).notNull(),
},
(table) => [
	index("idx_gift_promotion_brands_brand").on(table.brandId),
	primaryKey({ columns: [table.promotionId, table.brandId], name: "gift_promotion_brands_promotion_id_brand_id"}),
]);

export const giftPromotions = mysqlTable("gift_promotions", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	descriptionRu: text(),
	descriptionRo: text(),
	giftId: int("gift_id", { unsigned: true }).notNull(),
	offerId: int("offer_id", { unsigned: true }),
	conditionQty: int("condition_qty", { unsigned: true }).default(2).notNull(),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	showOnSite: tinyint("show_on_site").default(1).notNull(),
	isOnline: tinyint("is_online", { unsigned: true }).default(1).notNull(),
	progressMode: varchar("progress_mode", { length: 16 }).default('time').notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateFrom: date("date_from", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateTo: date("date_to", { mode: 'string' }),
	sorder: int().default(0).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	index("idx_gift_promotions_active").on(table.isEnabled, table.showOnSite, table.isOnline, table.dateFrom, table.dateTo, table.sorder, table.id),
	index("idx_gift_promotions_gift").on(table.giftId),
	index("idx_gift_promotions_offer").on(table.offerId),
	primaryKey({ columns: [table.id], name: "gift_promotions_id"}),
]);

export const gifts = mysqlTable("gifts", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	descriptionRu: text(),
	descriptionRo: text(),
	productId: int("product_id"),
	variantId: int("variant_id"),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	showOnSite: tinyint("show_on_site").default(1).notNull(),
	sorder: int().default(0).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	index("idx_gifts_enabled_order").on(table.isEnabled, table.sorder, table.id),
	index("idx_gifts_product").on(table.productId),
	index("idx_gifts_variant").on(table.variantId),
	index("idx_gifts_visible_order").on(table.showOnSite, table.isEnabled, table.sorder, table.id),
	primaryKey({ columns: [table.id], name: "gifts_id"}),
]);

export const homeBrandSectionProducts = mysqlTable("home_brand_section_products", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	sectionId: int("section_id", { unsigned: true }).notNull().references(() => homeBrandSections.id, { onDelete: "cascade" } ),
	productId: int("product_id", { unsigned: true }).notNull(),
	sorder: int().default(0).notNull(),
	isShown: tinyint().default(1).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_brand_section_products").on(table.sectionId, table.isShown, table.sorder),
	index("idx_brand_product_id").on(table.productId),
	primaryKey({ columns: [table.id], name: "home_brand_section_products_id"}),
	unique("uniq_brand_section_product").on(table.sectionId, table.productId),
]);

export const homeBrandSections = mysqlTable("home_brand_sections", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	urlRu: varchar({ length: 500 }).notNull(),
	urlRo: varchar({ length: 500 }).notNull(),
	img: varchar({ length: 255 }),
	imgMob: varchar({ length: 255 }),
	placement: mysqlEnum(['after_new','after_sale']).default('after_new').notNull(),
	sorder: int().default(0).notNull(),
	isShown: tinyint().default(1).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_brand_sections_position").on(table.placement, table.isShown, table.sorder),
	primaryKey({ columns: [table.id], name: "home_brand_sections_id"}),
]);

export const homeCategories = mysqlTable("home_categories", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	urlRu: varchar({ length: 500 }).notNull(),
	urlRo: varchar({ length: 500 }).notNull(),
	img: varchar({ length: 255 }),
	sorder: int().default(0).notNull(),
	isShown: tinyint().default(1).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_home_categories_visible_order").on(table.isShown, table.sorder),
	primaryKey({ columns: [table.id], name: "home_categories_id"}),
]);

export const homeProductItems = mysqlTable("home_product_items", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	sectionKey: varchar("section_key", { length: 30 }).notNull(),
	productId: int("product_id", { unsigned: true }).notNull(),
	sorder: int().default(0).notNull(),
	isShown: tinyint().default(1).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_home_section_visible_order").on(table.sectionKey, table.isShown, table.sorder),
	index("idx_home_product_id").on(table.productId),
	primaryKey({ columns: [table.id], name: "home_product_items_id"}),
	unique("uniq_home_section_product").on(table.sectionKey, table.productId),
]);

export const menu = mysqlTable("menu", {
	id: int().autoincrement().notNull(),
	uriRu: varchar({ length: 300 }).notNull(),
	uriRo: varchar({ length: 300 }).notNull(),
	uriEn: varchar({ length: 300 }).notNull(),
	titleRu: varchar({ length: 250 }),
	titleRo: varchar({ length: 250 }),
	titleEn: varchar({ length: 255 }),
	descRu: text().notNull(),
	descRo: text().notNull(),
	descEn: text().notNull(),
	textRu: text(),
	textRo: text(),
	textEn: text(),
	seoTitleRu: varchar({ length: 250 }),
	seoTitleRo: varchar({ length: 250 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	breadcrumbTitleRo: varchar({ length: 255 }),
	breadcrumbTitleRu: varchar({ length: 255 }),
	seoDescEn: text(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(1).notNull(),
	onTop: int().default(0).notNull(),
	onBottom: int().default(0).notNull(),
	parentId: int().default(0),
	system: tinyint().default(0).notNull(),
	img: varchar({ length: 255 }),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "menu_id"}),
]);

export const offers = mysqlTable("offers", {
	id: int().autoincrement().notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateFrom: date("date_from", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	dateTo: date("date_to", { mode: 'string' }).notNull(),
	titleRu: varchar({ length: 256 }),
	titleRo: varchar({ length: 256 }),
	titleEn: varchar({ length: 256 }),
	descRu: varchar({ length: 1024 }).notNull(),
	descRo: varchar({ length: 1024 }).notNull(),
	descEn: varchar({ length: 1024 }).notNull(),
	uriRu: varchar({ length: 256 }),
	uriRo: varchar({ length: 256 }),
	uriEn: varchar({ length: 256 }),
	sale: varchar({ length: 32 }).notNull(),
	isOnline: tinyint("is_online", { unsigned: true }).default(1).notNull(),
	progressMode: varchar("progress_mode", { length: 16 }).default('time').notNull(),
	locationRu: varchar({ length: 254 }).notNull(),
	locationRo: varchar({ length: 254 }).notNull(),
	imgB: varchar({ length: 255 }).notNull(),
	img: varchar({ length: 256 }),
	imgRu: varchar({ length: 254 }).notNull(),
	imgRo: varchar({ length: 254 }).notNull(),
	imgBru: varchar({ length: 254 }).notNull(),
	imgBro: varchar({ length: 254 }).notNull(),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	seoDescEn: text(),
	viewHome: int("view_home").notNull(),
	sorder: int().default(0),
	isShown: tinyint().default(1),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	updatedAt: date("updated_at", { mode: 'string' }).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	createdAt: date("created_at", { mode: 'string' }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "offers_id"}),
]);

export const offersProducts = mysqlTable("offers_products", {
	id: int().autoincrement().notNull(),
	offersId: int("offers_id").notNull(),
	productId: int("product_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	sku: varchar("SKU", { length: 32 }).notNull(),
	sorder: int().notNull(),
	isShown: tinyint().default(1).notNull(),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "offers_products_id"}),
]);

export const orders = mysqlTable("orders", {
	id: int().autoincrement().notNull(),
	orderSource: varchar("order_source", { length: 16 }).default('unknown').notNull(),
	orderId: int("order_id"),
	status: mysqlEnum(['new','progress','finished','canceled']).default('new').notNull(),
	"1C": int().notNull(),
	clientId: int("client_id").notNull(),
	total: varchar({ length: 64 }).notNull(),
	deliveryPrice: int("delivery_price").notNull(),
	delivery: int(),
	bonusPlus: varchar("bonus_plus", { length: 32 }).notNull(),
	bonusMinus: varchar("bonus_minus", { length: 32 }).notNull(),
	payment: int(),
	paySuccess: int("pay_success").notNull(),
	stores: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	surname: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 255 }).notNull(),
	message: text(),
	contactName: varchar({ length: 128 }).notNull(),
	postcode: varchar({ length: 32 }).notNull(),
	address: varchar({ length: 255 }).notNull(),
	street: varchar({ length: 128 }).notNull(),
	locality: varchar({ length: 128 }).notNull(),
	town: varchar({ length: 128 }).notNull(),
	county: varchar({ length: 128 }).notNull(),
	city: varchar({ length: 255 }).notNull(),
	telephone: varchar({ length: 32 }).notNull(),
	notes: text().notNull(),
	ip: varchar({ length: 128 }).notNull(),
	externalId: varchar("ExternalID", { length: 64 }).notNull(),
	voucher: varchar({ length: 32 }).notNull(),
	added: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`),
	updated: datetime({ mode: 'string'}),
	sorder: int().notNull(),
	isb2B: tinyint().default(0).notNull(),
	promoId: int("promo_id", { unsigned: true }),
	promoCode: varchar("promo_code", { length: 64 }),
	promoDiscount: decimal("promo_discount", { precision: 10, scale: 2 }).default('0.00').notNull(),
},
(table) => [
	index("idx_orders_promo_id").on(table.promoId),
	index("idx_orders_promo_code").on(table.promoCode),
	primaryKey({ columns: [table.id], name: "orders_id"}),
]);

export const ordersProducts = mysqlTable("orders_products", {
	id: int().autoincrement().notNull(),
	orderId: int("order_id").notNull(),
	productId: int("product_id"),
	qty: int(),
	price: varchar({ length: 64 }),
	total: varchar({ length: 64 }),
	options: varchar({ length: 32 }),
	rouletteGiftId: bigint("roulette_gift_id", { mode: "number", unsigned: true }),
	giftPromotionId: bigint("gift_promotion_id", { mode: "number", unsigned: true }),
	promoDiscount: decimal("promo_discount", { precision: 10, scale: 2 }).default('0.00').notNull(),
},
(table) => [
	index("idx_orders_products_order_id").on(table.orderId),
	index("idx_orders_products_product_id").on(table.productId),
	primaryKey({ columns: [table.id], name: "orders_products_id"}),
]);

export const paynetLogs = mysqlTable("paynet_logs", {
	id: int().autoincrement().notNull(),
	orderId: varchar("order_id", { length: 255 }).notNull(),
	message: varchar({ length: 255 }).notNull(),
	response: text(),
	date: varchar({ length: 32 }),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "paynet_logs_id"}),
]);

export const productCategories = mysqlTable("product_categories", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull().references(() => products.id, { onDelete: "cascade" } ),
	categoryId: int("category_id").notNull().references(() => categories.id, { onDelete: "cascade" } ),
},
(table) => [
	index("product_id").on(table.productId),
	index("category_id").on(table.categoryId),
	primaryKey({ columns: [table.id], name: "product_categories_id"}),
	unique("uniq_product_category").on(table.productId, table.categoryId),
]);

export const productImportChanges = mysqlTable("product_import_changes", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	productId: int("product_id", { unsigned: true }).notNull(),
	productGuid: varchar("product_guid", { length: 128 }).notNull(),
	action: varchar({ length: 16 }).notNull(),
	changedFields: longtext("changed_fields").notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_product_import_changes_created_at").on(table.createdAt),
	index("idx_product_import_changes_product_id").on(table.productId),
	index("idx_product_import_changes_action").on(table.action),
	primaryKey({ columns: [table.id], name: "product_import_changes_id"}),
]);

export const productSearch = mysqlTable("product_search", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull(),
	variableId: int("variable_id"),
	guid: varchar("GUID", { length: 128 }),
	sku: varchar("SKU", { length: 128 }),
	title: text(),
	color: text(),
	volume: text(),
	searchText: text("search_text"),
},
(table) => [
	index("idx_product").on(table.productId),
	index("idx_variable").on(table.variableId),
	index("ft_search").on(table.title, table.sku, table.guid, table.color, table.volume, table.searchText),
	primaryKey({ columns: [table.id], name: "product_search_id"}),
]);

export const searchSynonymSettings = mysqlTable("search_synonym_settings", {
	id: int().notNull(),
	groupsJson: text("groups_json").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "search_synonym_settings_id"}),
]);

export const searchQueryStats = mysqlTable("search_query_stats", {
	queryDate: date("query_date", { mode: "string" }).notNull(),
	queryText: varchar("query_text", { length: 100 }).notNull(),
	searchCount: int("search_count", { unsigned: true }).default(1).notNull(),
	updatedAt: datetime("updated_at", { mode: "string" }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.queryDate, table.queryText], name: "search_query_stats_query_date_query_text"}),
	index("idx_search_query_date_count").on(table.queryDate, table.searchCount),
]);

export const products = mysqlTable("products", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	sku: varchar("SKU", { length: 128 }).notNull(),
	titleRu: varchar({ length: 256 }),
	h1Ru: varchar({ length: 255 }),
	breadcrumbTitleRu: varchar({ length: 255 }),
	titleRo: varchar({ length: 255 }).notNull(),
	h1Ro: varchar({ length: 255 }),
	breadcrumbTitleRo: varchar({ length: 255 }),
	titleEn: varchar({ length: 255 }).notNull(),
	descRu: varchar({ length: 255 }).notNull(),
	descRo: varchar({ length: 255 }).notNull(),
	descEn: varchar({ length: 255 }).notNull(),
	textRu: text(),
	textRo: text(),
	textEn: text().notNull(),
	uriRu: varchar({ length: 256 }),
	uriRo: varchar({ length: 256 }),
	uriEn: varchar({ length: 255 }).notNull(),
	price: float(),
	discountPrice: float("discount_price"),
	saleMdl: int("sale_mdl").notNull(),
	salePercent: int("sale_percent").notNull(),
	volume: varchar({ length: 32 }).notNull(),
	onStock: int("on_stock").default(1),
	stock: int().notNull(),
	isNew: tinyint("is_new").default(0),
	bestSelling: int("best_selling").notNull(),
	categoryId: int("category_id"),
	brandId: int("brand_id").default(0),
	featureType: int("feature_type").notNull(),
	reviews: varchar({ length: 64 }).notNull(),
	variations: varchar({ length: 32 }).notNull(),
	instructionRu: varchar({ length: 254 }),
	instructionRo: varchar({ length: 254 }),
	instructionEn: varchar({ length: 254 }),
	componentsRu: varchar({ length: 254 }),
	componentsRo: varchar({ length: 254 }),
	componentsEn: varchar({ length: 254 }),
	sex: varchar({ length: 64 }),
	searchTeg: varchar("search_teg", { length: 255 }).notNull(),
	seoTitleRu: varchar({ length: 255 }),
	seoTitleRo: varchar({ length: 255 }),
	seoTitleEn: varchar({ length: 255 }),
	seoKeywordsRu: text(),
	seoKeywordsRo: text(),
	seoKeywordsEn: text(),
	seoDescRu: text(),
	seoDescRo: text(),
	seoDescEn: text(),
	order: int().notNull(),
	sorder: int().default(1),
	isShown: tinyint().default(1),
	isGift: tinyint().default(0).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	priceWh: float().notNull(),
	barcode: varchar({ length: 256 }),
	onStockWh: int("on_stockWH").notNull(),
	warehouseName: varchar("WarehouseName", { length: 256 }),
	youtubeVideoId: varchar("youtube_video_id", { length: 11 }),
},
(table) => [
	index("id").on(table.id),
	index("isShown").on(table.isShown),
	index("SKU").on(table.sku),
	index("titleRU").on(table.titleRu),
	index("titleRO").on(table.titleRo),
	index("category_id").on(table.categoryId),
	index("brand_id").on(table.brandId),
	index("search_teg").on(table.searchTeg),
	index("GUID").on(table.guid),
	index("price").on(table.price),
	index("priceWH").on(table.priceWh),
	index("discount_price").on(table.discountPrice),
	index("sex").on(table.sex),
	index("best_selling").on(table.bestSelling),
	index("stock").on(table.stock),
	index("is_new").on(table.isNew),
	index("sorder").on(table.sorder),
	index("idx_products_shown_discount_price").on(table.isShown, table.discountPrice, table.price, table.id),
	primaryKey({ columns: [table.id], name: "products_id"}),
]);

export const productsFeatures = mysqlTable("products_features", {
	id: int().autoincrement().notNull(),
	productId: int("product_id"),
	categoryId: int("category_id"),
	featureId: int("feature_id"),
	featureValueId: int("feature_value_id"),
},
(table) => [
	primaryKey({ columns: [table.id], name: "products_features_id"}),
]);

export const productsImg = mysqlTable("products_img", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull(),
	img: varchar({ length: 64 }).notNull(),
	sorder: int().notNull(),
	isShown: tinyint().default(1).notNull(),
},
(table) => [
	index("ID").on(table.id),
	index("product_id").on(table.productId),
	index("sorder").on(table.sorder),
	index("idx_product_image_order").on(table.productId, table.sorder, table.id),
	primaryKey({ columns: [table.id], name: "products_img_id"}),
]);

export const productsMore = mysqlTable("products_more", {
	productId: int("product_id").notNull(),
	relatedId: int("related_id").notNull(),
},
(table) => [
	unique("product_id").on(table.productId, table.relatedId),
]);

export const productsRelated = mysqlTable("products_related", {
	productId: int("product_id").notNull(),
	relatedId: int("related_id").notNull(),
},
(table) => [
	unique("product_id").on(table.productId, table.relatedId),
]);

export const productsVariable = mysqlTable("products_variable", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull(),
	sku: varchar("SKU", { length: 32 }),
	titleRu: varchar({ length: 256 }),
	titleRo: varchar({ length: 255 }).notNull(),
	titleEn: varchar({ length: 255 }).notNull(),
	colorRu: varchar({ length: 254 }).notNull(),
	colorRo: varchar({ length: 254 }).notNull(),
	colorData: text("color_data"),
	colorHex: varchar({ length: 7 }),
	volumeVar: varchar("VolumeVar", { length: 254 }).notNull(),
	color: varchar({ length: 254 }),
	dose: varchar({ length: 255 }),
	price: double(),
	discountPrice: varchar("discount_price", { length: 32 }).notNull(),
	qty: int().notNull(),
	sorder: int().notNull(),
	isShown: tinyint().default(1),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	colorEn: varchar({ length: 254 }).notNull(),
	priceWh: double().notNull(),
	barcode: varchar({ length: 256 }),
	qtyWh: int().notNull(),
	warehouseName: varchar("WarehouseName", { length: 256 }),
},
(table) => [
	index("product_id").on(table.productId),
	index("SKU").on(table.sku),
	index("qty").on(table.qty),
	index("isShown").on(table.isShown),
	primaryKey({ columns: [table.id], name: "products_variable_id"}),
]);

export const productsVariableImg = mysqlTable("products_variable_img", {
	id: int().autoincrement().notNull(),
	productId: int("product_id").notNull(),
	variableId: int("variable_id").notNull(),
	img: varchar({ length: 64 }).notNull(),
	sorder: int().notNull(),
	isShown: tinyint().default(1).notNull(),
},
(table) => [
	index("ID").on(table.id),
	index("product_id").on(table.productId),
	index("variable_id").on(table.variableId),
	primaryKey({ columns: [table.id], name: "products_variable_img_id"}),
]);

export const promocodeBrands = mysqlTable("promocode_brands", {
	promocodeId: int("promocode_id", { unsigned: true }).notNull(),
	brandId: int("brand_id").notNull(),
},
(table) => [
	index("idx_promocode_brands_brand_id").on(table.brandId),
	primaryKey({ columns: [table.promocodeId, table.brandId], name: "promocode_brands_promocode_id_brand_id"}),
]);

export const promocodeEvents = mysqlTable("promocode_events", {
	id: int().autoincrement().notNull(),
	promocodeId: int("promocode_id"),
	clientId: int("client_id"),
	orderId: int("order_id"),
	code: varchar({ length: 100 }).notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	cartSubtotal: decimal("cart_subtotal", { precision: 12, scale: 2 }).default('0.00').notNull(),
	discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default('0.00').notNull(),
	finalTotal: decimal("final_total", { precision: 12, scale: 2 }).default('0.00').notNull(),
	reason: varchar({ length: 100 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: varchar("user_agent", { length: 500 }),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_promocode_id").on(table.promocodeId),
	index("idx_client_id").on(table.clientId),
	index("idx_order_id").on(table.orderId),
	index("idx_code").on(table.code),
	index("idx_event_type").on(table.eventType),
	index("idx_created_at").on(table.createdAt),
	primaryKey({ columns: [table.id], name: "promocode_events_id"}),
]);

export const promocodeExcludedBrands = mysqlTable("promocode_excluded_brands", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	promocodeId: int("promocode_id", { unsigned: true }).notNull(),
	brandId: int("brand_id").notNull(),
},
(table) => [
	index("idx_promocode_excluded_promocode").on(table.promocodeId),
	index("idx_promocode_excluded_brand").on(table.brandId),
	primaryKey({ columns: [table.id], name: "promocode_excluded_brands_id"}),
	unique("uq_promocode_brand").on(table.promocodeId, table.brandId),
]);

export const promocodeUsages = mysqlTable("promocode_usages", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	promocodeId: int("promocode_id", { unsigned: true }).notNull(),
	clientId: int("client_id").notNull(),
	orderId: int("order_id").notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_promo_usage_promocode").on(table.promocodeId),
	index("idx_promo_usage_client").on(table.clientId),
	index("idx_promo_usage_order").on(table.orderId),
	index("idx_promo_usage_client_promo").on(table.promocodeId, table.clientId),
	primaryKey({ columns: [table.id], name: "promocode_usages_id"}),
]);

export const promocodes = mysqlTable("promocodes", {
	id: int({ unsigned: true }).autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 64 }).notNull(),
	type: mysqlEnum(['percentage','fixed']).notNull(),
	value: decimal({ precision: 10, scale: 2 }).notNull(),
	minAmount: decimal("min_amount", { precision: 10, scale: 2 }),
	maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
	usageLimit: int("usage_limit", { unsigned: true }),
	perUserLimit: int("per_user_limit", { unsigned: true }).default(1),
	allowDiscounted: tinyint("allow_discounted").default(0).notNull(),
	startsAt: datetime("starts_at", { mode: 'string'}),
	endsAt: datetime("ends_at", { mode: 'string'}),
	status: mysqlEnum(['draft','active','disabled']).default('draft').notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	brandScope: mysqlEnum("brand_scope", ['all','selected']).default('all').notNull(),
},
(table) => [
	index("idx_promocodes_status").on(table.status),
	index("idx_promocodes_dates").on(table.startsAt, table.endsAt),
	primaryKey({ columns: [table.id], name: "promocodes_id"}),
	unique("uq_promocodes_code").on(table.code),
]);

export const rouletteAccountState = mysqlTable("roulette_account_state", {
	clientId: bigint("client_id", { mode: "number", unsigned: true }).notNull(),
	nextSpinAt: datetime("next_spin_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).notNull(),
},
(table) => [
	primaryKey({ columns: [table.clientId], name: "roulette_account_state_client_id"}),
]);

export const roulettePaymentReservations = mysqlTable("roulette_payment_reservations", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	spinId: bigint("spin_id", { mode: "number", unsigned: true }).notNull(),
	orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
	paynetExternalId: varchar("paynet_external_id", { length: 64 }).notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
	reservedUntil: datetime("reserved_until", { mode: 'string'}).notNull(),
	status: varchar({ length: 16 }).default('pending').notNull(),
	resolvedAt: datetime("resolved_at", { mode: 'string'}),
},
(table) => [
	index("idx_roulette_reservation_spin_status").on(table.spinId, table.status, table.reservedUntil),
	index("idx_roulette_reservation_order").on(table.orderId),
	primaryKey({ columns: [table.id], name: "roulette_payment_reservations_id"}),
	unique("uniq_roulette_paynet_external_id").on(table.paynetExternalId),
]);

export const roulettePrizes = mysqlTable("roulette_prizes", {
	id: smallint({ unsigned: true }).autoincrement().notNull(),
	code: varchar({ length: 40 }).notNull(),
	titleRu: varchar({ length: 120 }).notNull(),
	titleRo: varchar({ length: 120 }).notNull(),
	rewardType: varchar("reward_type", { length: 32 }).notNull(),
	rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
	rewardPayload: varchar("reward_payload", { length: 120 }),
	probability: decimal({ precision: 5, scale: 2 }),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	sortOrder: smallint("sort_order").notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_roulette_prizes_order").on(table.sortOrder, table.id),
	primaryKey({ columns: [table.id], name: "roulette_prizes_id"}),
	unique("uniq_roulette_prizes_code").on(table.code),
]);

export const rouletteSettings = mysqlTable("roulette_settings", {
	id: tinyint({ unsigned: true }).notNull(),
	titleRu: varchar({ length: 120 }).notNull(),
	titleRo: varchar({ length: 120 }).notNull(),
	descriptionRu: text(),
	descriptionRo: text(),
	rulesRu: text(),
	rulesRo: text(),
	updatedAt: datetime("updated_at", { mode: 'string'}).notNull(),
	isEnabled: tinyint("is_enabled").default(0).notNull(),
	isVisible: tinyint("is_visible").default(1).notNull(),
	spinIntervalHours: int("spin_interval_hours", { unsigned: true }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "roulette_settings_id"}),
]);

export const rouletteSpins = mysqlTable("roulette_spins", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	clientId: bigint("client_id", { mode: "number", unsigned: true }).notNull(),
	prizeId: smallint("prize_id", { unsigned: true }).notNull(),
	requestId: char("request_id", { length: 36 }).notNull(),
	prizeCodeSnapshot: varchar("prize_code_snapshot", { length: 40 }).notNull(),
	rewardTypeSnapshot: varchar("reward_type_snapshot", { length: 32 }).notNull(),
	rewardValueSnapshot: decimal("reward_value_snapshot", { precision: 10, scale: 2 }),
	rewardPayloadSnapshot: varchar("reward_payload_snapshot", { length: 120 }),
	titleRuSnapshot: varchar("titleRU_snapshot", { length: 120 }).notNull(),
	titleRoSnapshot: varchar("titleRO_snapshot", { length: 120 }).notNull(),
	probabilitySnapshot: decimal("probability_snapshot", { precision: 5, scale: 2 }).notNull(),
	spunAt: datetime("spun_at", { mode: 'string'}).notNull(),
	expiresAt: datetime("expires_at", { mode: 'string'}).notNull(),
	status: varchar({ length: 16 }).default('active').notNull(),
	orderId: bigint("order_id", { mode: "number", unsigned: true }),
	usedAt: datetime("used_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_roulette_spin_account_status_expiry").on(table.clientId, table.status, table.expiresAt),
	index("idx_roulette_spin_order").on(table.orderId),
	primaryKey({ columns: [table.id], name: "roulette_spins_id"}),
	unique("uniq_roulette_spin_request").on(table.clientId, table.requestId),
]);

export const shopCartItems = mysqlTable("shop_cart_items", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 255 }).notNull(),
	contactId: int("contact_id"),
	rowid: varchar({ length: 255 }).notNull(),
	productId: int("product_id").notNull(),
	skuId: int("sku_id"),
	name: varchar({ length: 255 }),
	createDatetime: datetime("create_datetime", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
	qty: int().notNull(),
	price: decimal({ precision: 15, scale: 4 }),
	options: text().notNull(),
},
(table) => [
	index("rowid").on(table.rowid),
	index("product_id").on(table.productId),
	index("code").on(table.code),
	primaryKey({ columns: [table.id], name: "shop_cart_items_id"}),
]);

export const shopFeature = mysqlTable("shop_feature", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	typeId: int("type_id").notNull(),
	nameRu: varchar("name_RU", { length: 255 }).notNull(),
	nameRo: varchar("name_RO", { length: 255 }).notNull(),
	nameEn: varchar("name_EN", { length: 255 }).notNull(),
	type: int().default(0).notNull(),
	freeValues: int("free_values").notNull(),
	sorder: int().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shop_feature_id"}),
]);

export const shopFeatureValues = mysqlTable("shop_feature_values", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	featureId: int("feature_id").notNull(),
	nameRu: varchar("name_RU", { length: 255 }),
	nameRo: varchar("name_RO", { length: 255 }),
	nameEn: varchar("name_EN", { length: 255 }),
	color: varchar({ length: 10 }).default('#ffffff').notNull(),
	sorder: int().default(0).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shop_feature_values_id"}),
]);

export const shopType = mysqlTable("shop_type", {
	id: int().autoincrement().notNull(),
	guid: varchar("GUID", { length: 128 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	sorder: int().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "shop_type_id"}),
]);

export const siteFeedback = mysqlTable("site_feedback", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	feedbackType: mysqlEnum("feedback_type", ['idea','bug','question']).notNull(),
	message: text().notNull(),
	pagePath: varchar("page_path", { length: 255 }),
	referenceUrl: varchar("reference_url", { length: 2048 }),
	locale: varchar({ length: 10 }),
	status: mysqlEnum(['new','in_progress','done','rejected']).default('new').notNull(),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	index("idx_site_feedback_type").on(table.feedbackType),
	index("idx_site_feedback_status").on(table.status),
	index("idx_site_feedback_created_at").on(table.createdAt),
	primaryKey({ columns: [table.id], name: "site_feedback_id"}),
]);

export const siteFeedbackImages = mysqlTable("site_feedback_images", {
	id: bigint({ mode: "number", unsigned: true }).autoincrement().notNull(),
	feedbackId: bigint("feedback_id", { mode: "number", unsigned: true }).notNull(),
	filePath: varchar("file_path", { length: 255 }).notNull(),
	originalName: varchar("original_name", { length: 255 }),
	createdAt: datetime("created_at", { mode: 'string'}).notNull(),
},
(table) => [
	index("idx_site_feedback_images_feedback_id").on(table.feedbackId),
	primaryKey({ columns: [table.id], name: "site_feedback_images_id"}),
]);

export const siteSupportSettings = mysqlTable("site_support_settings", {
	id: tinyint({ unsigned: true }).notNull(),
	isEnabled: tinyint("is_enabled").default(1).notNull(),
	telegramContact: varchar("telegram_contact", { length: 255 }).notNull(),
	supportPhone: varchar("support_phone", { length: 32 }),
	updatedAt: datetime("updated_at", { mode: 'string'}),
},
(table) => [
	primaryKey({ columns: [table.id], name: "site_support_settings_id"}),
]);

export const siteThemeSettings = mysqlTable("site_theme_settings", {
	id: tinyint({ unsigned: true }).notNull(),
	themeKey: varchar("theme_key", { length: 32 }).default('default').notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "site_theme_settings_id"}),
]);

export const sliders = mysqlTable("sliders", {
	id: int().autoincrement().notNull(),
	titleRu: varchar({ length: 250 }),
	titleRo: varchar({ length: 250 }),
	titleEn: varchar({ length: 255 }),
	descRu: text().notNull(),
	descRo: text().notNull(),
	descEn: text().notNull(),
	infoRu: varchar({ length: 250 }),
	infoRo: varchar({ length: 250 }),
	infoEn: varchar({ length: 255 }),
	buttonRu: varchar({ length: 64 }),
	buttonRo: varchar({ length: 64 }),
	buttonEn: varchar({ length: 64 }),
	uriRu: varchar({ length: 300 }).notNull(),
	uriRo: varchar({ length: 300 }).notNull(),
	uriEn: varchar({ length: 300 }).notNull(),
	colorText: varchar("ColorText", { length: 32 }).notNull(),
	colorButton: varchar("ColorButton", { length: 32 }).notNull(),
	colorButtonText: varchar("ColorButtonText", { length: 32 }).notNull(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(1).notNull(),
	img: varchar({ length: 255 }),
	imgMob: varchar({ length: 254 }).notNull(),
	youtube: varchar({ length: 254 }),
	video: varchar({ length: 256 }),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "sliders_id"}),
]);

export const stores = mysqlTable("stores", {
	id: int().autoincrement().notNull(),
	titleRu: varchar({ length: 250 }),
	titleRo: varchar({ length: 250 }),
	titleEn: varchar({ length: 255 }),
	phone: varchar({ length: 255 }),
	coords: varchar({ length: 255 }),
	descRu: text().notNull(),
	descRo: text().notNull(),
	descEn: text().notNull(),
	textRu: text(),
	textRo: text(),
	textEn: text(),
	iframeGoogle: varchar("iframe_google", { length: 1024 }),
	delivery: int().notNull(),
	isShown: tinyint().default(1).notNull(),
	sorder: int().default(1).notNull(),
	onBottom: int().default(0).notNull(),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "stores_id"}),
]);

export const storesImg = mysqlTable("stores_img", {
	id: int().autoincrement().notNull(),
	storesId: int("stores_id").notNull(),
	img: varchar({ length: 64 }).notNull(),
	sorder: int().notNull(),
	isShown: tinyint().default(1).notNull(),
},
(table) => [
	index("ID").on(table.id),
	primaryKey({ columns: [table.id], name: "stores_img_id"}),
]);

export const subscribe = mysqlTable("subscribe", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 256 }),
	active: varchar({ length: 256 }),
	ip: varchar({ length: 255 }).notNull(),
	send: varchar({ length: 256 }),
	sorder: int().default(0),
	isShown: tinyint().default(1),
},
(table) => [
	primaryKey({ columns: [table.id], name: "subscribe_id"}),
]);

export const subscriptions = mysqlTable("subscriptions", {
	id: int().autoincrement().notNull(),
	email: varchar({ length: 256 }),
	mailing: tinyint().default(1),
	sorder: int().default(0),
	isShown: tinyint().default(1),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "subscriptions_id"}),
]);

export const vslLogs = mysqlTable("vsl_logs", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	type: varchar({ length: 100 }).notNull(),
	text: mediumtext().notNull(),
	date: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "vsl_logs_id"}),
]);

export const sitePopups = mysqlTable("site_popups", {
	id: int().autoincrement().notNull(),
	titleRu: varchar({ length: 255 }).notNull(),
	titleRo: varchar({ length: 255 }).notNull(),
	textRu: text().notNull(),
	textRo: text().notNull(),
	image: varchar({ length: 128 }),
	ctaLabelRu: varchar({ length: 128 }).default('').notNull(),
	ctaLabelRo: varchar({ length: 128 }).default('').notNull(),
	ctaUrl: varchar({ length: 255 }).default('').notNull(),
	audience: mysqlEnum(['all', 'guest', 'authenticated']).default('all').notNull(),
	startAt: datetime("start_at", { mode: 'string'}),
	endAt: datetime("end_at", { mode: 'string'}),
	reshowDays: int("reshow_days").default(1).notNull(),
	isShown: tinyint("is_shown").default(1).notNull(),
	sorder: int().default(0).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string'}),
	createdAt: datetime("created_at", { mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`).notNull(),
},
(table) => [
	index("idx_site_popups_shown_audience").on(table.isShown, table.audience),
	primaryKey({ columns: [table.id], name: "site_popups_id"}),
]);

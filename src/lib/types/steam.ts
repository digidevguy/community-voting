export interface SteamGameResponse {
	[appId: string]: {
		success: boolean;
		data: GameData;
	};
}

export interface GameData {
	type: string;
	name: string;
	steam_appid: number;
	required_age: string;
	is_free: boolean;
	controller_support?: string;
	detailed_description: string;
	about_the_game: string;
	short_description: string;
	supported_languages: string;
	header_image: string;
	capsule_image: string;
	capsule_imagev5: string;
	website: string;
	pc_requirements: SystemRequirements;
	mac_requirements: SystemRequirements;
	linux_requirements: SystemRequirements;
	legal_notice: string;
	ext_user_account_notice?: string;
	developers: string[];
	publishers: string[];
	price_overview?: PriceOverview;
	packages: number[];
	package_groups: PackageGroup[];
	platforms: Platforms;
	categories: Category[];
	genres: Genre[];
	screenshots: Screenshot[];
	movies: Movie[];
	recommendations?: Recommendations;
	achievements?: Achievements;
	release_date: ReleaseDate;
	support_info: SupportInfo;
	background: string;
	background_raw: string;
	content_descriptors: ContentDescriptors;
	ratings: Ratings;
}

interface SystemRequirements {
	minimum: string;
	recommended: string;
}

interface PriceOverview {
	currency: string;
	initial: number;
	final: number;
	discount_percent: number;
	initial_formatted: string;
	final_formatted: string;
}

interface PackageGroup {
	name: string;
	title: string;
	description: string;
	selection_text: string;
	save_text: string;
	display_type: number;
	is_recurring_subscription: string;
	subs: PackageSubscription[];
}

interface PackageSubscription {
	packageid: number;
	percent_savings_text: string;
	percent_savings: number;
	option_text: string;
	option_description: string;
	can_get_free_license: string;
	is_free_license: boolean;
	price_in_cents_with_discount: number;
}

interface Platforms {
	windows: boolean;
	mac: boolean;
	linux: boolean;
}

export interface Category {
	id: number;
	description: string;
}

export interface Genre {
	id: string;
	description: string;
}

interface Screenshot {
	id: number;
	path_thumbnail: string;
	path_full: string;
}

interface Movie {
	id: number;
	name: string;
	thumbnail: string;
	webm: VideoFormats;
	mp4: VideoFormats;
	dash_av1?: string;
	dash_h264?: string;
	hls_h264?: string;
	highlight: boolean;
}

interface VideoFormats {
	'480': string;
	max: string;
}

interface Recommendations {
	total: number;
}

interface Achievements {
	total: number;
	highlighted: Achievement[];
}

interface Achievement {
	name: string;
	path: string;
}

interface ReleaseDate {
	coming_soon: boolean;
	date: string;
}

interface SupportInfo {
	url: string;
	email: string;
}

interface ContentDescriptors {
	ids: number[];
	notes: string;
}

interface Ratings {
	esrb?: RatingInfo;
	pegi?: RatingInfo;
	usk?: RatingInfoWithId;
	oflc?: RatingInfo;
	nzoflc?: RatingInfo;
	cero?: RatingInfo;
	kgrb?: RatingInfo;
	dejus?: RatingInfo;
	mda?: RatingInfoMinimal;
	fpb?: RatingInfo;
	csrr?: RatingInfo;
	crl?: RatingInfoMinimal;
	steam_germany?: SteamGermanyRating;
}

interface RatingInfo {
	rating: string;
	use_age_gate: string;
	required_age: string;
	descriptors?: string;
	interactive_elements?: string;
}

interface RatingInfoWithId extends RatingInfo {
	rating_id: string;
}

interface RatingInfoMinimal {
	use_age_gate: string;
	required_age: string;
	rating?: string;
}

interface SteamGermanyRating {
	rating_generated: string;
	rating: string;
	required_age: string;
	banned: string;
	use_age_gate: string;
	descriptors: string;
}

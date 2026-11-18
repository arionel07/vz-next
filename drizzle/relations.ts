import { relations } from "drizzle-orm/relations";
import { beautySelections, beautySelectionProducts, homeBrandSections, homeBrandSectionProducts, categories, productCategories, products } from "./schema";

export const beautySelectionProductsRelations = relations(beautySelectionProducts, ({one}) => ({
	beautySelection: one(beautySelections, {
		fields: [beautySelectionProducts.selectionId],
		references: [beautySelections.id]
	}),
}));

export const beautySelectionsRelations = relations(beautySelections, ({many}) => ({
	beautySelectionProducts: many(beautySelectionProducts),
}));

export const homeBrandSectionProductsRelations = relations(homeBrandSectionProducts, ({one}) => ({
	homeBrandSection: one(homeBrandSections, {
		fields: [homeBrandSectionProducts.sectionId],
		references: [homeBrandSections.id]
	}),
}));

export const homeBrandSectionsRelations = relations(homeBrandSections, ({many}) => ({
	homeBrandSectionProducts: many(homeBrandSectionProducts),
}));

export const productCategoriesRelations = relations(productCategories, ({one}) => ({
	category: one(categories, {
		fields: [productCategories.categoryId],
		references: [categories.id]
	}),
	product: one(products, {
		fields: [productCategories.productId],
		references: [products.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	productCategories: many(productCategories),
}));

export const productsRelations = relations(products, ({many}) => ({
	productCategories: many(productCategories),
}));
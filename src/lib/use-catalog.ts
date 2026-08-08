import { useEffect, useState } from "react";

import { api, type Depot, type DepotProduct } from "./api";

type CatalogState = {
	depots: Depot[];
	products: DepotProduct[];
	updatedAt: Date | null;
	isLoading: boolean;
};

export function useCatalog(): CatalogState {
	const [state, setState] = useState<CatalogState>({
		depots: [],
		products: [],
		updatedAt: null,
		isLoading: true,
	});

	useEffect(() => {
		let cancelled = false;
		Promise.all([api.catalog.depots(), api.catalog.products()]).then(
			([depots, products]) => {
				if (cancelled) return;
				setState({ depots, products, updatedAt: new Date(), isLoading: false });
			},
		);
		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}

export const formatNaira = (amount: number) =>
	`₦${amount.toLocaleString("en-NG")}`;

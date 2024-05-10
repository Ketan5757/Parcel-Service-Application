"use client";
import { useAppStore } from "@/state/appState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { findServicePoints } from "@/lib/dhl";

import { cn, findMidpoint } from "@/lib/utils";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Icons } from "@/components/icons";
import { createParcel } from "@/lib/parcels";

const LeafletMap = dynamic(() => import("../../components/leafletMap"), {
	ssr: false,
});

export default function Shipping() {
	const router = useRouter();
	const { isLoading, setIsLoading } = useAppStore();
	const [error, setError] = useState(null);
	const [shipmentMode, setShipmentMode] = useState("warehouse");
	const [sourceAddressList, setSourceAddressList] = useState([]);
	const [selectedSourceAddress, setSelectedSourceAddress] = useState({});
	const [mapData, setMapData] = useState([]);
	const [centreLocation, setCentreLocation] = useState({
		lat: 49.3988,
		lng: 8.6724,
	});
	const [geoDataMap, setGeoDataMap] = useState({
		deliveryLat: 0,
		deliverLng: 0,
		pickupLat: 0,
		pickupLng: 0,
		sourceLat: 0,
		sourceLng: 0,
		sourceLabel: "Unknown",
	});

	useEffect(() => {
		setIsLoading(true);
		fetchPoints(20, 0, "servicepoint");
	}, []);

	const fetchPoints = async (limit, offset, category) => {
		const { results, error } = await findServicePoints(limit, offset, category);
		if (results != null) {
			setSourceAddressList(results);
			setIsLoading(false);
		} else {
			console.log("Error: ", error);
		}
	};

	const handleShipmentTypeChange = (e) => {
		console.log(e);
		setShipmentMode(e);
		if (e == "warehouse") {
			fetchPoints(40, 0, ["pobox", "postoffice", "servicepoint"]);
		} else if (e == "dropoff") {
			fetchPoints(40, 0, ["locker", "postbank", "postbox"]);
		} else if (e == "pickup") {
			setSourceAddressList([]);
		}
	};

	const handleGeolocationUpdates = (e) => {
		console.log(e.target.id);
		let temp = geoDataMap;

		if (e.target.id == "sourceLat" || e.target.id == "sourceLng") {
			temp["pickupLat"] = 0;
			temp["pickupLng"] = 0;
		}

		temp[e.target.id] = e.target.value;

		setGeoDataMap(temp);
		updateMapData(temp);
		console.log(mapData);
	};

	const updateMapData = (mapPoints) => {
		let geoMap = [];
		let isMapDataUpdated = false;

		if (mapPoints["deliveryLat"] > 0 && mapPoints["deliveryLng"] > 0) {
			console.log("delivery loaction set");
			geoMap.push({
				lat: mapPoints["deliveryLat"],
				lng: mapPoints["deliveryLng"],
				popUpContent: "Destination",
				type: "DESTINATION",
			});
			isMapDataUpdated = true;
		}

		if (mapPoints["pickupLat"] > 0 && mapPoints["pickupLng"] > 0) {
			console.log("pickup loaction set");
			geoMap.push({
				lat: mapPoints["pickupLat"],
				lng: mapPoints["pickupLng"],
				popUpContent: "Pickup Point",
				type: "DESTINATION PICKUP",
			});
			isMapDataUpdated = true;
		} else if (mapPoints["sourceLat"] > 0 && mapPoints["sourceLng"] > 0) {
			console.log("source location set");
			geoMap.push({
				lat: mapPoints["sourceLat"],
				lng: mapPoints["sourceLng"],
				popUpContent: mapPoints["sourceLabel"],
				type: "WAREHOUSE",
			});
			isMapDataUpdated = true;
		}

		if (isMapDataUpdated) {
			setMapData(geoMap);
			setCentreLocation(findMidpoint(mapPoints));
		}
	};

	const selectSourceAddress = (e) => {
		console.log(e);
		let sourceData = sourceAddressList[e.split("#")[1]];
		console.log(sourceData);
		let temp = geoDataMap;
		temp["sourceLat"] = sourceData.place.geo.latitude;
		temp["sourceLng"] = sourceData.place.geo.longitude;
		temp["sourceLabel"] = "Servicepoint: " + sourceData.url.split("/")[2];
		temp["pickupLat"] = 0;
		temp["pickupLng"] = 0;
		setSelectedSourceAddress({
			house: "Servicepoint: " + sourceData.url.split("/")[2],
			street: sourceData.place.address.streetAddress ?? "",
			city: sourceData.place.address.addressLocality ?? "",
			state: "",
			zipcode: sourceData.place.address.postalCode ?? "",
			country: sourceData.place.address.countryCode ?? "",
			lat: temp["sourceLat"],
			lng: temp["sourceLng"],
			warehouseId: sourceData.url,
		});
		updateMapData(temp);
	};

	async function submitShippingForm(event) {
		setIsLoading(true);
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const customerName = String(formData.get("customerName")) ?? "";
		let sourceAddress = {};
		if (shipmentMode == "pickup") {
			sourceAddress = {
				house: String(formData.get("pickupHouse")) ?? "",
				street: String(formData.get("pickupStreet")) ?? "",
				city: String(formData.get("pickupCity")) ?? "",
				state: String(formData.get("pickupState")) ?? "",
				zipcode: String(formData.get("pickupZipcode")) ?? "",
				country: String(formData.get("pickupCountry")) ?? "",
				lat: Number(formData.get("pickupLat")) ?? 0,
				lng: Number(formData.get("pickupLng")) ?? 0,
			};
		} else {
			sourceAddress = {
				house: selectedSourceAddress["house"],
				street: selectedSourceAddress["street"],
				city: selectedSourceAddress["city"],
				state: selectedSourceAddress["state"],
				zipcode: selectedSourceAddress["zipcode"],
				country: selectedSourceAddress["country"],
				lat: Number(selectedSourceAddress["lat"]),
				lng: Number(selectedSourceAddress["lng"]),
			};
		}

		let deliveryAddress = {
			house: String(formData.get("deliveryHouse")) ?? "",
			street: String(formData.get("deliveryStreet")) ?? "",
			city: String(formData.get("deliveryCity")) ?? "",
			state: String(formData.get("deliveryState")) ?? "",
			zipcode: String(formData.get("deliveryZipcode")) ?? "",
			country: String(formData.get("deliveryCountry")) ?? "",
			lat: Number(formData.get("deliveryLat")) ?? "",
			lng: Number(formData.get("deliveryLng")) ?? "",
		};

		if (
			customerName != "" &&
			deliveryAddress["lat"] > 0 &&
			deliveryAddress["lng"] > 0
		) {
			const timestampInMilliseconds = new Date().getTime();
			let parcelData = {
				customerName: customerName,
				trackingId: Number(timestampInMilliseconds),
				status:
					shipmentMode == "pickup"
						? "PENDING PICKUP"
						: shipmentMode == "dropoff"
						? "PENDING DROPOFF"
						: "AT WAREHOUSE",
				lastLocation: {
					lat: sourceAddress["lat"],
					lng: sourceAddress["lng"],
				},
				lastWarehouseId: selectedSourceAddress["warehouseId"],
				destinationAddress: {
					houseName: deliveryAddress["house"],
					street: deliveryAddress["street"],
					city: deliveryAddress["city"],
					state: deliveryAddress["state"],
					zipcode: deliveryAddress["zipcode"],
					country: deliveryAddress["country"],
				},
				destinationGeo: {
					lat: deliveryAddress["lat"],
					lng: deliveryAddress["lng"],
				},
				sourceAddress: {
					houseName: sourceAddress["house"],
					street: sourceAddress["street"],
					city: sourceAddress["city"],
					state: sourceAddress["state"],
					zipcode: sourceAddress["zipcode"],
					country: sourceAddress["country"],
				},
				sourceGeo: {
					lat: sourceAddress["lat"],
					lng: sourceAddress["lng"],
				},
			};

			const { results, error } = await createParcel(parcelData);

			if (results != null) {
				console.log("Results: ", results);
				setIsLoading(false);
				router.push("/track/" + parcelData.trackingId);
			} else {
				setError(error);
				console.log("Error: ", error);
				setIsLoading(false);
			}
		} else {
			setError("Missing Credentials.");
		}

		setIsLoading(false);
	}

	return (
		<div className="flex flex-row flex-1 justify-between gap-10 p-10 pt-[90px] max-h-screen">
			<Card className="shadow-m w-3/6 flex flex-1 flex-col h-full">
				<form
					onSubmit={submitShippingForm}
					className="flex flex-col h-full justify-between"
				>
					<CardHeader>
						<CardTitle>Shipping</CardTitle>
						<CardDescription>
							Create a parcel for pickup/ delivery.
						</CardDescription>
					</CardHeader>
					<CardContent className="h-full overflow-y-scroll">
						<div className="grid w-full items-center gap-4">
							<div className="flex flex-col space-y-1.5">
								<Label htmlFor="email">Customer Name</Label>
								<Input
									id="customerName"
									name="customerName"
									placeholder="Enter full name of customer"
									type="string"
									autoCapitalize="none"
									autoCorrect="off"
									disabled={isLoading}
								/>
							</div>
							<RadioGroup
								defaultValue={shipmentMode}
								className="flex w-full gap-10 pt-5"
								onValueChange={handleShipmentTypeChange}
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="warehouse" id="warehouse" />
									<Label htmlFor="warehouse">Located at Warehouse</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="dropoff" id="dropoff" />
									<Label htmlFor="dropoff">Drop off at Packstation</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="pickup" id="pickup" />
									<Label htmlFor="pickup">Pick Up Request</Label>
								</div>
							</RadioGroup>
							{(shipmentMode == "warehouse" || shipmentMode == "dropoff") && (
								<>
									<Select
										className="w-inherit"
										onValueChange={selectSourceAddress}
									>
										<SelectTrigger className="w-inherit">
											<SelectValue placeholder="Select source location" />
										</SelectTrigger>
										<SelectContent className="w-[300px]">
											{sourceAddressList != null && (
												<div className="flex flex-wrap gap-2 md:pt-5 justify-center">
													{sourceAddressList.map((item, index) => (
														<SelectItem
															key={index}
															value={`source#${index}`}
															disabled={
																item.totalSlots &&
																item.occupiedSlots == item.totalSlots
															}
														>
															<div className="text-md font-bold">
																{item.place.address.streetAddress}
															</div>
															<div>
																{item.place.address.addressLocality},{" "}
																{item.place.address.countryCode},{" "}
																{item.place.address.postalCode}
															</div>
															{item.totalSlots != undefined &&
																item.occupiedSlots != undefined && (
																	<div className="text-sm">
																		Slots available:{" "}
																		{item.totalSlots - item.occupiedSlots}{" "}
																		{" / "}
																		{item.totalSlots}
																	</div>
																)}
														</SelectItem>
													))}
												</div>
											)}
										</SelectContent>
									</Select>
								</>
							)}
							{shipmentMode == "pickup" && (
								<>
									<div className="flex flex-col space-y-1.5 w-full">
										<Label className="pt-3 pb-1 text-md">
											Pickup Location Address
										</Label>
										<Label htmlFor="email">House Name</Label>
										<Input
											id="pickupHouse"
											name="pickupHouse"
											placeholder="house number/ name"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
										<Label htmlFor="email">Street Address</Label>
										<Input
											id="pickupStreet"
											name="pickupStreet"
											placeholder="street name"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
										<div className="flex gap-2 w-full">
											<div className="flex flex-col space-y-1.5 w-full">
												<Label htmlFor="email">City</Label>
												<Input
													id="pickupCity"
													name="pickupCity"
													placeholder="name of nearest city"
													type="string"
													autoCapitalize="none"
													autoCorrect="off"
													disabled={isLoading}
												/>
											</div>
											<div className="flex flex-col space-y-1.5">
												<Label htmlFor="email">Postal Code</Label>
												<Input
													id="pickupZipcode"
													name="pickupZipcode"
													placeholder="area zip code"
													type="string"
													autoCapitalize="none"
													autoCorrect="off"
													disabled={isLoading}
												/>
											</div>
										</div>
										<div className="flex gap-2 w-full">
											<div className="flex flex-col space-y-1.5 w-full">
												<Label htmlFor="email">State</Label>
												<Input
													id="pickupState"
													name="pickupState"
													placeholder="state name"
													type="string"
													autoCapitalize="none"
													autoCorrect="off"
													disabled={isLoading}
												/>
											</div>
											<div className="flex flex-col space-y-1.5 w-full">
												<Label htmlFor="email">Country</Label>
												<Input
													id="pickupCountry"
													name="pickupCountry"
													placeholder="country code"
													type="string"
													autoCapitalize="none"
													autoCorrect="off"
													disabled={isLoading}
												/>
											</div>
										</div>
									</div>

									<div className="flex flex-col space-y-1.5 w-full">
										<Label className="pt-3 pb-1 text-md">
											Pickup Geo Location
										</Label>
										<div className="flex gap-2 w-full">
											<div className="flex flex-col space-y-1.5 w-full">
												<Label htmlFor="email">Latitude</Label>
												<Input
													id="pickupLat"
													name="pickupLat"
													placeholder="gps latitude"
													type="decimal"
													autoCapitalize="none"
													autoCorrect="off"
													disabled={isLoading}
													onChange={handleGeolocationUpdates}
												/>
											</div>
											<div className="flex flex-col space-y-1.5 w-full">
												<Label htmlFor="email">Longitude</Label>
												<Input
													id="pickupLng"
													name="pickupLng"
													placeholder="gps longitude"
													type="decimal"
													autoCapitalize="none"
													autoCorrect="off"
													onChange={handleGeolocationUpdates}
													disabled={isLoading}
												/>
											</div>
										</div>
									</div>
								</>
							)}
							<div className="flex flex-col space-y-1.5">
								<Label className="pt-3 pb-1 text-md">Destination Address</Label>
								<Label htmlFor="email">House Name</Label>
								<Input
									id="deliveryHouse"
									name="deliveryHouse"
									placeholder="house number/ name"
									type="string"
									autoCapitalize="none"
									autoCorrect="off"
									disabled={isLoading}
								/>
								<Label htmlFor="email">Street Address</Label>
								<Input
									id="deliveryStreet"
									name="deliveryStreet"
									placeholder="street name"
									type="string"
									autoCapitalize="none"
									autoCorrect="off"
									disabled={isLoading}
								/>
								<div className="flex gap-2 w-full">
									<div className="flex flex-col space-y-1.5 w-full">
										<Label htmlFor="email">City</Label>
										<Input
											id="deliveryCity"
											name="deliveryCity"
											placeholder="name of nearest city"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
									</div>
									<div className="flex flex-col space-y-1.5">
										<Label htmlFor="email">Postal Code</Label>
										<Input
											id="deliveryZipcode"
											name="deliveryZipcode"
											placeholder="area zip code"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
									</div>
								</div>
								<div className="flex gap-2 w-full">
									<div className="flex flex-col space-y-1.5 w-full">
										<Label htmlFor="email">State</Label>
										<Input
											id="deliveryState"
											name="deliveryState"
											placeholder="state name"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
									</div>
									<div className="flex flex-col space-y-1.5 w-full">
										<Label htmlFor="email">Country</Label>
										<Input
											id="deliveryCountry"
											name="deliveryCountry"
											placeholder="country code"
											type="string"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
										/>
									</div>
								</div>
							</div>

							<div className="flex flex-col space-y-1.5">
								<Label className="pt-5 pb-1 text-md">
									Destination Geo Location
								</Label>
								<div className="flex gap-2 w-full">
									<div className="flex flex-col space-y-1.5 w-full">
										<Label htmlFor="email">Latitude</Label>
										<Input
											id="deliveryLat"
											name="deliveryLat"
											placeholder="Enter latitude"
											type="decimal"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
											onChange={handleGeolocationUpdates}
										/>
									</div>
									<div className="flex flex-col space-y-1.5 w-full">
										<Label htmlFor="email">Longitude</Label>
										<Input
											id="deliveryLng"
											name="deliveryLng"
											placeholder="Enter gps longitude"
											type="decimal"
											autoCapitalize="none"
											autoCorrect="off"
											disabled={isLoading}
											onChange={handleGeolocationUpdates}
										/>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
					<CardFooter className="flex justify-between py-3">
						<div className="grid w-full items-center">
							<button className={cn(buttonVariants())} disabled={isLoading}>
								{isLoading && (
									<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
								)}
								Create Parcel
							</button>
							{error != "" && (
								<p className="px-1 text-xs text-red-600 justify-center text-center">
									{error}
								</p>
							)}
						</div>
					</CardFooter>
				</form>
			</Card>
			<div className="flex w-3/6 shadow-m">
				<LeafletMap
					locations={mapData}
					centreLocation={centreLocation}
					mapZoom={13}
				/>
			</div>
		</div>
	);
}

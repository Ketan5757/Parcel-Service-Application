'use server'

import clientPromise from "./mongodb";

export async function findServicePoints(limit, offset, categories) {
    try {

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_NAME);
        const query = {};

        const categoryList = Array.isArray(categories)
			? categories
			: [categories];
		
        if (categories && categories.length > 0) {
            query["location.type"] = { $in: categoryList };
        }
        console.log(query)
        const options = { 
            projection: {
                id: { $toString: "$_id" },
                url: 1,
                location: 1,
                name: 1,
                place: 1,
                totalSlots: 1,
                occupiedSlots: 1,
                _id: 0
            },
            skip: offset, limit: limit };
        const locationData = await db.collection("dhl").find(query, options).toArray();

        return { results: locationData };
    } catch (error) {
        console.log('error', error);
        return { data: null, error: 'Failed to fetch location records: ' + error };
    }
}


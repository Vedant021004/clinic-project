from typing import List, Dict, Any

class MetadataFilter:
    """
    Applies metadata-aware constraints with automatic broad-retrieval fallback.
    Prevents over-filtering from accidentally eliminating relevant knowledge.
    """

    def apply_filter(self, candidates: List[Dict[str, Any]], entities: Dict[str, Any], min_candidates: int = 2) -> List[Dict[str, Any]]:
        target_location = entities.get("location")
        target_service = entities.get("service")

        if not target_location and not target_service:
            return candidates

        filtered = []
        for cand in candidates:
            meta = cand.get("metadata", {})
            loc = meta.get("location", "general")
            locs_mentioned = meta.get("locations_mentioned", [])
            srv = meta.get("service", "general")
            srvs_mentioned = meta.get("services_mentioned", [])

            loc_match = True
            if target_location:
                # Match if chunk is specific to location, mentions location, or is global ("all"/"general")
                loc_match = (loc == target_location or 
                             target_location in locs_mentioned or 
                             loc in ("all", "general"))

            srv_match = True
            if target_service:
                # Match if chunk is specific to service, mentions service, or is global ("multiple"/"general")
                srv_match = (srv == target_service or 
                             target_service in srvs_mentioned or 
                             srv in ("multiple", "general"))

            if loc_match and srv_match:
                # Boost score slightly for exact metadata alignment
                cand_copy = dict(cand)
                cand_copy["metadata_matched"] = True
                filtered.append(cand_copy)

        # Fallback to broader candidate set if filtered results are insufficient
        if len(filtered) < min_candidates:
            return candidates

        return filtered

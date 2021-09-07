import json
import pandas as pd
import numpy as np
import requests
import os.path

from datetime import datetime
from perspective import Table

PENGUINS_CONTRACT = "0xbd3531da5cf5857e7cfaa92426877b022e612cf8"
ROOT_URL = "https://api.opensea.io/api/v1"
HERE = os.path.dirname(os.path.realpath(__file__))
LOOKUP_JSON = None

with open(os.path.join(HERE, "..", "lookup.json"), "r") as lookup:
    LOOKUP_JSON = json.loads(lookup.read())


def parse_event(event):
    if not event or event.get("asset") is None:
        print("Could not parse event: {}".format(event))
        return None

    parsed = {
        "permalink": event["asset"]["permalink"],
        "event_datetime": datetime.fromisoformat(event["created_date"]),
        "seller_username": None,
        "buyer_username": None,
    }

    for k in ("id", "token_id", "num_sales", "name", "image_url"):
        v = event["asset"].get(k, None)
        parsed["asset_{}".format(k)] = int(v) if k == "token_id" else v

    parsed["payment_token_symbol"] = event["payment_token"].get("symbol", None)
    parsed["payment_token_eth_price"] = float(
        event["payment_token"].get("eth_price", None)
    )
    parsed["payment_token_usd_price"] = float(
        event["payment_token"].get("usd_price", None)
    )

    parsed["price"] = float(event["total_price"]) / float(
        10 ** event["payment_token"]["decimals"]
    )

    if event["seller"].get("user"):
        parsed["seller_username"] = event["seller"]["user"]["username"]

    if event["winner_account"].get("user"):
        parsed["buyer_username"] = event["winner_account"]["user"]["username"]

    parsed["seller_address"] = event["seller"]["address"]
    parsed["buyer_address"] = event["winner_account"]["address"]
    parsed["transaction_timestamp"] = datetime.fromisoformat(
        event["transaction"]["timestamp"]
    )
    parsed["transaction_hash"] = event["transaction"]["transaction_hash"]

    # add x0, x1, y0, y1 of the dataset
    coordinates = LOOKUP_JSON.get(str(parsed["asset_token_id"]))

    if not coordinates:
        print("Could not find coordinates for token ID: {}".format(parsed["asset_token_id"]))

    parsed["x0"] = coordinates[0]
    parsed["x1"] = coordinates[1]
    parsed["y0"] = coordinates[2]
    parsed["y1"] = coordinates[3]

    return parsed


def fetch_events(contract_address):
    """Fetches asset sales for the provided contract address."""
    url = "{}/events".format(ROOT_URL)
    offset = 0
    limit = 50
    params = {
        "asset_contract_address": contract_address,
        "limit": 50,
        "event_type": "successful",
        "only_opensea": True,
        "offset": offset,
    }

    res = requests.get(url, params=params)

    if not res.ok:
        print("Could not fetch events, reason: {}", res.reason)
        return

    events = res.json()["asset_events"]
    data = [parse_event(ev) for ev in events]

    print("Fetched {} initial records".format(len(data)))

    while len(events) == limit:
        offset += limit
        print("Fetching records {} to {}".format(offset, offset + limit))
        params["offset"] = offset
        res = requests.get(url, params=params)

        if not res.ok:
            print("Could not fetch events, returning already fetched events, reason: {}", res.reason)
            break

        res_json = res.json()

        if "asset_events" not in res_json:
            print("No more events in json: {}".format(res_json))
            break

        events = res_json["asset_events"]

        for ev in events:
            try:
                parsed = parse_event(ev)
                if parsed is not None:
                    data.append(parsed)
            except:
                print("Could not parse event: {}".format(ev))
                continue


    df = pd.DataFrame(data)
    print(df.dtypes)
    return df

def clean_existing_arrow():
    arrow_path = os.path.join(HERE, "..", "static", "data.arrow")
    new_arrow_path = os.path.join(HERE, "..", "static", "cleaned.arrow")
    new_arrow = None
    with open(arrow_path, "rb") as arr:
        table = Table(arr.read(), index="transaction_hash")
        cols = table.columns()
        view = table.view(columns=[c for c in cols if c not in ("seller_username", "buyer_username")])
        new_arrow = view.to_arrow()

    with open(new_arrow_path, "wb") as new_arrow_binary:
        new_arrow_binary.write(new_arrow)
    
    print("Saved new cleaned.arrow")


if __name__ == "__main__":
    # df = fetch_events(PENGUINS_CONTRACT)
    # table = Table(df, index="transaction_hash")
    # arrow = table.view().to_arrow()
    # arrow_path = os.path.join(HERE, "..", "..", "data.arrow")
    # with open(arrow_path, "wb") as arrow_binary:
    #     arrow_binary.write(arrow)
    #     print("Saved arrow to: {}".format(arrow_path))
    clean_existing_arrow()

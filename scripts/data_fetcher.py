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

STATIC_PATH = os.path.join(HERE, "..", "static")
ARROW_PATH = os.path.join(HERE, "..", "static", "data.arrow")
CLEANED_PATH = os.path.join(HERE, "..", "static", "cleaned.arrow")


def parse_event(event):
    if not event or event.get("asset") is None:
        print("Could not parse event: no asset field")
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

    # parsed["seller_address"] = event["seller"]["address"]
    # parsed["buyer_address"] = event["winner_account"]["address"]




    parsed["seller_address"] = event["seller"]["address"]
    parsed["seller"] = (event["seller"].get("user", None) or dict()).get("username", None)
    parsed["seller_img_url"] = event["seller"]["profile_img_url"]

    parsed["buyer_address"] = event["winner_account"]["address"]
    parsed["buyer"] = (event["winner_account"].get("user", None) or dict()).get("username", None)
    parsed["buyer_img_url"] = event["winner_account"]["profile_img_url"]

  
    parsed["transaction_timestamp"] = datetime.fromisoformat(
        event["transaction"]["timestamp"]
    )
    parsed["transaction_hash"] = event["transaction"]["transaction_hash"]

    return parsed


def fetch_events(contract_address):
    """Fetches asset sales for the provided contract address."""
    url = "{}/events".format(ROOT_URL)
    offset = 0
    limit = 200
    params = {
        "asset_contract_address": contract_address,
        "limit": limit,
        "event_type": "successful",
        "only_opensea": True,
        "offset": offset,
    }

    res = requests.get(url, params=params)

    if not res.ok:
        print("Could not fetch events, reason: {}", res.reason)
        return

    events = res.json()["asset_events"]
    data = [event for event in (parse_event(ev) for ev in events) if event is not None]

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
    return df

def clean_existing_arrow():
    new_arrow = None
    with open(ARROW_PATH, "rb") as arr:
        table = Table(arr.read(), index="transaction_hash")
        cols = table.columns()
        view = table.view(columns=[c for c in cols if c not in ("seller_username", "buyer_username")])
        df = view.to_df()
        df["image"] = df["asset_token_id"]
        t2 = Table(df, index="transaction_hash")
        new_arrow = t2.view(columns=[c for c in t2.columns() if c != "index"]).to_arrow()

    with open(CLEANED_PATH, "wb") as new_arrow_binary:
        new_arrow_binary.write(new_arrow)
    
    print("Saved new cleaned.arrow")


if __name__ == "__main__":
    if not os.path.exists(ARROW_PATH) or not os.path.exists(CLEANED_PATH):
        try:
            os.mkdir(STATIC_PATH)
        except:
            pass
        df = fetch_events(PENGUINS_CONTRACT)
        table = Table(df, index="transaction_hash")
        arrow = table.view().to_arrow()
        with open(ARROW_PATH, "wb") as arrow_binary:
            arrow_binary.write(arrow)
            print("Saved arrow to: {}".format(ARROW_PATH))
    
    clean_existing_arrow()

import requests
import shutil
import os.path
import os
from PIL import Image

from datetime import datetime
from math import floor

PENGUINS_CONTRACT = "0xbd3531da5cf5857e7cfaa92426877b022e612cf8"
ROOT_URL = "https://api.opensea.io/api/v1"
HERE = os.path.dirname(os.path.realpath(__file__))

def process_image(json, out):
    out[int(json["token_id"])] = json["image_url"] 

def fetch_images():
    url = ROOT_URL + "/assets"
    params = {
        "asset_contract_address": PENGUINS_CONTRACT,
        "limit": 50,
        "order_direction": "asc",
        "offset": 0
    }
    TOTAL = 8888
    offset = 50
    req = requests.get(url, params=params)    
    json = req.json()["assets"]

    urls = {}

    for asset in json:
        process_image(asset, urls)

    while offset < TOTAL or len(urls) < TOTAL:
        print("grabbing", offset, offset + 50)
        params["offset"] = offset
        req = requests.get(url, params=params)
        json = req.json()["assets"]

        for asset in json:
            process_image(asset, urls)

        print(len(urls))
        offset += 50

    return urls

def fetch_accounts():
    url = ROOT_URL + "/assets"
    params = {
        "asset_contract_address": PENGUINS_CONTRACT,
        "limit": 50,
        "order_direction": "asc",
        "offset": 0
    }
    TOTAL = 8888
    offset = 50
    req = requests.get(url, params=params)
    urls = {}
    
    for side in ["seller_address", "buyer_address"]:
        json = req.json()["assets"]

        for asset in json:
            process_image(asset, urls)

        while offset < TOTAL or len(urls) < TOTAL:
            print("grabbing", offset, offset + 50)
            params["offset"] = offset
            req = requests.get(url, params=params)
            json = req.json()["assets"]
            for row in json:
                urls[int(row["token_id"])] = row["image_url"] 

            print(len(urls))
            offset += 50

    return urls

def download_images(images):
    SAVE_PATH = os.path.join(HERE, "..", "images")

    for asset_id, image_url in images.items():
        url = image_url + "=s200"
        resp = requests.get(url, stream=True)
        resp.raw.decode_content = True
        name = "{}.png".format(asset_id)
        with open(os.path.join(SAVE_PATH, name), "wb") as png:
            shutil.copyfileobj(resp.raw, png)
        print("saved", name)

def process_images():
    PATH = os.path.join(HERE, "..", "images")
    WIDTH = int(18800 / 4)
    HEIGHT = int(19000 / 4)
    output_image = Image.new("RGB", (WIDTH, HEIGHT), "white")
    x, y = 0, 0

    inputs = os.listdir(PATH)
    inputs.sort(key = lambda filename: int(filename.split(".png")[0]) if ".png" in filename else -1)

    lookup = {}

    for input_img in inputs:
        if ".png" not in input_img:
            continue
        try:
            with Image.open(os.path.join(PATH, input_img)) as img:
                resized = img.resize((50, 50))
                x_remaining = WIDTH - x
                y_remaining = HEIGHT - y

                if y_remaining < 0:
                    print("running out of Y space, saving")
                    break 

                if x_remaining == 0:
                    print("Breaking to next line, x: {}, y: {}, x_remaining: {}, y_remaining: {}".format(x, y, x_remaining, y_remaining))
                    y += 50
                    x = 0
                
                box = (x, y)

                asset_id = int(input_img.split(".png")[0])

                if asset_id in lookup:
                    raise ValueError("Collision at {}".format(resized.filename))

                    # x0, x1, y0, y1
                lookup[asset_id] = [x, x + 50, y, y + 50]

                print(img.filename, box)

                output_image.paste(resized, box)

                x += 50
        except OSError as err:
            print("Failed at image", input_img, err)
            continue

    output_image.save(os.path.join(PATH,  "full_{}.jpg".format(datetime.now())), quality=100)

    from json import dumps

    with open(os.path.join(PATH, "lookup.json"), "w") as lookup_json:
        lookup_json.write(dumps(lookup))

    print("Saved!")


if __name__ == "__main__":
    # Download all images first, if we don't have the source
    if not os.path.exists(os.path.join(HERE, "..", "images")):
        os.path.mkdir(os.path.join(HERE, "..", "images"))
        urls = fetch_images()
        download_images(urls)

        # Generate the main image
        process_images()

    # TODO: fetch account images
    # if not os.path.exists(os.path.join(HERE, "..", "accounts")):
        # os.path.mkdir(os.path.join(HERE, "..", "accounts"))
        # urls = fetch_accounts()
        # download_images(urls)

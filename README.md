# Perspective Pudgy Penguins Sales Dashboard

This is a [Perspective](https://github.com/finos/perspective) dashboard to visualize [Pudgy Penguins](https://pudgypenguins.io/) NFT
sales data from the [OpenSea API](https://docs.opensea.io/reference/api-overview). The data is not live - all sales transactions
from 08/10/2021 to 09/14/2021 are included, which provides an interesting corpus of data to analyze.

![Screenshot](https://i.imgur.com/5GWmfTB.png)

Some interesting technical details:

- Images for each penguin are encoded into one large image that contains all 8,888 penguins in order. To render the penguins into
the data grid, we calculate the `x` and `y` offset into the main image using the `asset_id`, and draw the image into a `<canvas>` which
is cached on a per-viewer basis and rendered into the datagrid using [regular-table](https://github.com/jpmchase/regular-table)'s `addStyleListener()`. This minimizes the initial # of network calls to retrieve the images, and the # of cache lookups on repeated load.

- The data is fetched from the OpenSea API in batches, and encoded into an [Apache Arrow](https://arrow.apache.org/) binary which stores the data in a memory-efficient, strongly-encoded format. `perspective-python` makes the encoding easy - just pass your data into a `perspective.Table` and create your arrow binary from the Table.

- More to be added...
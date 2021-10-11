# Perspective Pudgy Penguins Sales Dashboard

Using [Perspective](https://github.com/finos/perspective), this dashboard interactively visualizes and analyzes [Pudgy Penguins](https://pudgypenguins.io/) NFT sales data using the [OpenSea API](https://docs.opensea.io/reference/api-overview).

### Explore the dashboard [here](https://sc1f.github.io/pudgy-penguin-perspective/).

![Screenshot of dashboard](https://i.imgur.com/fyoJgxQ.png)

### What is Perspective?

[Perspective](https://perspective.finos.org) is an interactive visualization component for large, real-time datasets using a high-performance WebAssembly data engine and visualization layer. Running entirely in the browser, Perspective enables technical and non-technical users to quickly transform, dissect, and visualize their dataset without having to configure a data server or manually construct charts.

This dashboard also demonstrates some of the innovative and easy ways that Perspective's visualization plugins and appearance can be customized by end-users:

- [custom_datagrid.ts](https://github.com/sc1f/pudgy-penguin-perspective/blob/master/src/custom_datagrid.ts) shows how Perspective's datagrid can be quickly customized to restyle content and insert new elements using [regular-table](https://github.com/jpmorganchase/regular-table)'s `addStyleListener` API.
    * Images for each of the 8,888 penguins are not loaded individually into the grid. Instead, they are pre-encoded into an image that contains each penguin in order. Each image in the datagrid is actually a `<canvas>` element that renders the correct offset into the parent image. This allows for the browser to efficiently cache the large asset, and minimizes on network calls during scrolling/rendering.
    * Where applicable, URLs are rendered for users to click away and explore further details on OpenSea. For example, buyer/seller usernames and wallet addresses are displayed as URLs.
    * The custom datagrid does not overwrite the logic of the datagrid bundled with Perspective. Instead, it is implemented as an additional plugin that implements Perspective's plugin API, and is automatically bundled into each `<perspective-viewer>` element on the page.
- [custom_heatmap.ts](https://github.com/sc1f/pudgy-penguin-perspective/blob/master/src/custom_heatmap.ts) shows how the charting plugins (which utilize [d3fc](https://d3fc.io/)) can be quickly customized to display custom colors and other user-defined configuration options.

Finally, the interaction with the OpenSea API uses `perspective-python` to store and transform the data before exporting the dataset to an Apache Arrow binary stored on disk.
### Running the dashboard locally

1. `git clone` the repository
2. Install JS and Python dependencies:

```bash
$ yarn
$ pip install perspective-python requests pillow
```
3. Run `yarn fetch:images` to download the penguin images and encode them into a single file for the dashboard.
4. Run `yarn fetch:data` to download the transaction data from the OpenSea API and encode them into an Apache Arrow.
5. Run `yarn start` to start the Webpack dev server - the dashboard should start running!
### Dataset

Using OpenSea's [Events](https://docs.opensea.io/reference/retrieving-asset-events) API, the data fetcher scripts pull all _Sales_ events for Pudgy Penguins. Because bids can be placed arbitarily by any user and don't have to be accepted by the owner, actual sales and transfers are more representative for data analysis and visualization.

While Perspective is designed for both _static_ and _streaming_ datasets, NFT sales do not "stream" like a traditional order book/liquid market would, so this dashboard only displays static data from 08/12/2021 to 10/11/2021, which is still an excellent corpus for analysis and visualization.
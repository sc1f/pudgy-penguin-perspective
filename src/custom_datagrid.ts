import type { View } from "@finos/perspective";
import type { PerspectiveViewerElement, PerspectiveViewerPluginElement } from "@finos/perspective-viewer";

function style_listener(viewer_id: any, image: any, table: any, viewer: any): void {
    viewer.save().then((config: any) => {
        const html_table = table.children[0].children[1];
        const num_rows = html_table.rows.length;
        const num_row_pivots = config["row_pivots"]?.length || 0;
        const rpidx = config["row_pivots"]?.indexOf("image");

        // Only render the same image once per cycle
        const rendered_assets = new Set();

        for (let ridx = 0; ridx < table.children[0].children[0].rows.length; ridx++) {
            const row = table.children[0].children[0].rows[ridx];
            for (let cidx = 0; cidx < row.cells.length; cidx++) {
                const th = row.cells[cidx];
                const meta = table.getMeta(th);
                const type = table.parentElement.model._schema[meta.column_header[meta.column_header.length - 1]];
                th.classList.toggle("is-timestamp", type === "date" || type === "datetime");

            }
        }

        for (let ridx = 0; ridx < num_rows; ridx++) {
            const row = html_table.rows[ridx];
            for (let cidx = 0; cidx < row.cells.length; cidx++) {
                const td = row.cells[cidx];
                const meta = table.getMeta(td);

                if (!meta) continue;

                // Render when pivoted on "image", and don't render
                // if the "image" column is also in the view.
                if (
                    num_row_pivots > 0 &&
                    rpidx !== -1 &&
                    rpidx + 1 === meta.row_header_x &&
                    meta.value !== ""
                ) {
                    const row_path = meta.value
                        .toString()
                        .replace(/,/g, "");

                    if (!row_path) {
                        continue;
                    }

                    const asset_id = row_path;
                    td.innerHTML = "";
                    td.appendChild(
                        makeCanvas(viewer_id, asset_id, image)
                    );

                    break;
                }

                const type = table.parentElement.model._schema[meta.column_header?.[meta.column_header?.length - 1]];
                td.classList.toggle("is-timestamp", type === "date" || type === "datetime");

                // Don't render top row for non pivoted views.
                // if (ridx == 0) break;

                const match_image = matchColumn(meta, "image");
                td.classList.toggle("penguin-canvas", match_image);

                // Or when "image" is shown, but not for total rows
                if (match_image) {
                    const asset_id = meta.user;

                    if (!asset_id) {
                        continue;
                    }

                    td.innerHTML = "";
                    td.appendChild(
                        makeCanvas(viewer_id, asset_id, image)
                    );
                } else if (
                    matchColumn(meta, "permalink") ||
                    matchColumn(meta, "asset_image_url")
                ) {
                    // Render HTML links for permalink
                    const url = td.innerText;
                    td.innerHTML = "";
                    const a = document.createElement("a");
                    a.href = url;
                    a.target = "blank";

                    // remove https:// from display
                    a.innerText = url.substring(8);

                    if (url.includes("googleusercontent")) {
                        a.innerText = `${url.substring(8, 30)}...`;
                    }

                    a.classList.add("data-permalink");
                    td.appendChild(a);
                }
            }
        }
    });
}

const Datagrid = customElements.get("perspective-viewer-datagrid") as typeof PerspectiveViewerPluginElement;
class CustomDatagrid extends Datagrid {
    _initialized_datagrid: boolean = false;

    // THis hack prevents a bug in workspace due to hard-coded plugin name
    // "Datagrid", but causes console errors ...
    connectedCallback() {
        const viewer = this.parentElement as PerspectiveViewerElement;
        viewer.addEventListener("perspective-click", event => {
            (event as any).detail.config = {};
        });
    }

    async delete() {
        console.log("WIP");
    }

    async draw(view: View) {
        await super.draw(view);
        if (!this._initialized_datagrid) {
            this._initialized_datagrid = true;
            const table = this.children[0] as any;
            const viewer = this.parentElement as PerspectiveViewerElement;
            const image: HTMLImageElement = new Image();
            const task = new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            image.src = "./thumbnails.jpg";
            await task;

            table.addStyleListener(() => {
                const viewer_id = viewer.getAttribute("slot") as string;
                LAST_CANVAS[viewer_id] = 0;
                style_listener(viewer_id, image, table, viewer)
            });

            await super.draw(view);
        }

        
    }

    get name() {
        return "Custom Datagrid"
    }
}

customElements.define("custom-datagrid", CustomDatagrid);
customElements.get("perspective-viewer").registerPlugin("custom-datagrid");

const VIEWER_CACHE: Record<string, Array<HTMLCanvasElement>> = {};
const LAST_CANVAS: Record<string, number> = {};
const MAX_CACHE = 300;

const makeCanvas = (
    viewer_id: string,
    asset_id: number,
    image: HTMLImageElement
): HTMLCanvasElement => {
    LAST_CANVAS[viewer_id] = LAST_CANVAS[viewer_id] || 0;
    VIEWER_CACHE[viewer_id] = VIEWER_CACHE[viewer_id] || [];

    const cache = VIEWER_CACHE[viewer_id];

    if (LAST_CANVAS[viewer_id] >= MAX_CACHE) {
        LAST_CANVAS[viewer_id] = 0;
    }

    const canvas = cache[LAST_CANVAS[viewer_id]] = cache[LAST_CANVAS[viewer_id]] || (() => {
        const canvas: HTMLCanvasElement =
            document.createElement("canvas");
        canvas.width = 50;
        canvas.height = 50;
        return canvas;
    })();

    const ctx = canvas.getContext("2d", { alpha: false });
    const sx = (asset_id % 94) * 50;
    const sy = Math.floor(asset_id / 94) * 50;
    ctx?.drawImage(image, sx, sy, 50, 50, 0, 0, 50, 50);

    LAST_CANVAS[viewer_id]++;

    return canvas;
};

const matchColumn = (meta: any, column_name: string): boolean => {
    return (
        !!meta.column_header &&
        // meta?.column_header?.length === 1 &&
        meta.column_header[meta?.column_header?.length - 1] === column_name
    );
};

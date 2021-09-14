/* eslint-disable @typescript-eslint/no-namespace */

import * as React from "react";
import * as ReactDOM from "react-dom";
import {useEffect, useRef} from "react";
import perspective, {Table} from "@finos/perspective";

import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";
import "@finos/perspective-workspace";

import "./index.css";
import "@finos/perspective-workspace/dist/umd/material.css";

import default_config from "./config.json";

// Required because perspective-workspace doesn't export type declarations
declare global {
    namespace JSX {
        interface IntrinsicElements {
            "perspective-workspace": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            >;
        }
    }
}

const worker = perspective.shared_worker();

const getTable = async (): Promise<Table> => {
    const req = fetch("./cleaned.arrow");
    const resp = await req;
    const buffer = await resp.arrayBuffer();
    return await worker.table(buffer as any);
};

const VIEWER_CACHE: Record<string, Array<HTMLCanvasElement>> = {};
const LAST_CANVAS: Record<string, number> = {};

const makeCanvas = (
    viewer_id: string,
    asset_id: number,
    image: HTMLImageElement
): HTMLCanvasElement => {
    const cache = VIEWER_CACHE[viewer_id];

    if (LAST_CANVAS[viewer_id] >= cache.length) {
        LAST_CANVAS[viewer_id] = 0;
    }

    const canvas = cache[LAST_CANVAS[viewer_id]];
    const ctx = canvas.getContext("2d", {alpha: false});
    const sx = (asset_id % 94) * 100;
    const sy = Math.floor(asset_id / 94) * 100;
    ctx?.drawImage(image, sx, sy, 100, 100, 0, 0, 100, 100);

    LAST_CANVAS[viewer_id]++;

    return canvas;
};

const matchColumn = (meta: any, column_name: string): boolean => {
    return (
        meta?.column_header?.length === 1 &&
        meta.column_header[0] === column_name
    );
};

/**
 * Given the large composite image, load the images into regular-table as the
 * left-most column and freeze it.
 * @param image
 */
const drawImage = (
    viewer_id: string,
    viewer: any,
    table: any,
    image: HTMLImageElement
): void => {
    // table.addEventListener("mousedown", (event: MouseEvent) => {
    //     const meta = table.getMeta(event.target);
    //     if (meta) {
    //         console.log(meta);
    //     }
    // });

    table.addStyleListener(() => {
        viewer.save().then((config: any) => {
            const html_table = table.children[0];
            const num_rows = html_table.rows.length;
            const num_row_pivots = config["row_pivots"]?.length || 0;
            const rpidx = config["row_pivots"]?.indexOf("image");
            // const has_column_pivots = config["column_pivots"].contains("image");

            // Only render the same image once per cycle
            const rendered_assets = new Set();

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
                        const row_path = meta.value.toString();

                        if (!row_path) {
                            continue;
                        }

                        const asset_id = row_path;

                        td.innerHTML = "";

                        if (!rendered_assets.has(asset_id)) {
                            td.appendChild(
                                makeCanvas(viewer_id, asset_id, image)
                            );
                        }

                        rendered_assets.add(asset_id);
                        break;
                    }

                    // render column headers
                    if (ridx === 0) {
                        break;
                    }

                    // Or when "image" is shown, but not for total rows
                    if (matchColumn(meta, "image")) {
                        const asset_id = meta.user;
                        td.innerHTML = "";

                        // Skip the overall total row
                        if (num_row_pivots > 0 && meta.y === 0) {
                            break;
                        }

                        // Allow double renders on unpivoted contexts, as
                        // a single asset can have many transactions.
                        if (
                            num_row_pivots === 0 ||
                            !rendered_assets.has(asset_id)
                        ) {
                            td.appendChild(
                                makeCanvas(viewer_id, asset_id, image)
                            );
                        }

                        rendered_assets.add(asset_id);
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
    });

    table.draw();

    const progress = document.getElementById("progress");
    progress?.setAttribute("style", "display:none;");
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Workspace = (): React.ReactElement => {
    const workspace = useRef<any>(null);

    useEffect(() => {
        const image: HTMLImageElement = new Image();
        image.src = "./thumbnails.jpg";

        if (workspace.current) {
            // Restore a saved config or default
            const config = window.localStorage.getItem(
                "pudgy_penguins_perspective_workspace_config"
            );
            workspace.current.addTable("asset_events", getTable());
            workspace.current
                .restore(config ? JSON.parse(config) : default_config)
                .then(() => {
                    workspace.current.addEventListener(
                        "workspace-layout-update",
                        (event: CustomEvent) => {
                            const layout = event.detail.layout;

                            for (const id in layout.viewers) {
                                if (VIEWER_CACHE[id] === undefined) {
                                    VIEWER_CACHE[id] = [];

                                    // Set up a new viewer
                                    const viewer_elem = document.querySelector(
                                        `perspective-viewer[slot=${id}]`
                                    ) as HTMLElement;

                                    const table =
                                        viewer_elem.getElementsByTagName(
                                            "regular-table"
                                        )[0];

                                    if (table === undefined) {
                                        // maybe a duplicate of a non-grid
                                        // viewer, so just try to initialize
                                        // the next cycle around.
                                        continue;
                                    }

                                    // Cache new <canvas> elements
                                    const num_canvases = 100;

                                    for (let i = 0; i <= num_canvases; i++) {
                                        const canvas: HTMLCanvasElement =
                                            document.createElement("canvas");
                                        canvas.width = 100;
                                        canvas.height = 100;
                                        VIEWER_CACHE[id].push(canvas);
                                    }
                                    LAST_CANVAS[id] = 0;
                                    drawImage(id, viewer_elem, table, image);
                                }
                            }

                            // clean up the cache for removed viewers
                            for (const id in VIEWER_CACHE) {
                                if (!layout.viewers[id]) {
                                    delete VIEWER_CACHE[id];
                                }
                            }

                            workspace.current.save().then((config: any) => {
                                console.log("Saving to localStorage:", config);
                                window.localStorage.setItem(
                                    "pudgy_penguins_perspective_workspace_config",
                                    JSON.stringify(config)
                                );
                            });
                        }
                    );
                });
        }
    });

    return <perspective-workspace ref={workspace}></perspective-workspace>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const App = (): React.ReactElement => {
    return (
        <div id="main" className="container">
            <Workspace />
        </div>
    );
};

window.addEventListener("load", () => {
    ReactDOM.render(<App />, document.getElementById("root"));
});

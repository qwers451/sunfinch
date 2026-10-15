/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// "New space" / "Edit space" dialog: name, color, icon and a preview of the
// space button. A modal <dialog> in the window: Enter confirms, Escape
// cancels.

{
  const { SpacesStore, COLORS, COLOR_SWATCHES, PICKABLE_ICONS, defaultName, spaceIconURL } =
    ChromeUtils.importESModule(
      "chrome://browser/content/sunfinch/modules/SunfinchSpacesStore.sys.mjs"
    );

  const DIALOG_ID = "sunfinch-space-dialog";
  const HTML_NS = "http://www.w3.org/1999/xhtml";

  function el(name, attrs = {}, children = []) {
    const node = document.createElementNS(HTML_NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      if (key == "l10n") {
        document.l10n.setAttributes(node, ...[].concat(value));
      } else {
        node.setAttribute(key, value);
      }
    }
    node.append(...children);
    return node;
  }

  window.SunfinchSpaceDialog = {
    get dialog() {
      return document.getElementById(DIALOG_ID);
    },

    get isOpen() {
      return !!this.dialog?.open;
    },

    /**
     * Opens the dialog for a new space, or for `space` to edit it.
     * Resolves to { name, color, icon }, or null when cancelled.
     */
    async open(space = null) {
      if (this.isOpen) {
        return null;
      }
      const spaces = SpacesStore.spaces;
      const index = space ? spaces.findIndex(s => s.id == space.id) : spaces.length;
      const number = index + 1;
      const fallbackName = space?.name || (await defaultName(number));
      const state = {
        name: space?.name ?? "",
        color: space?.color ?? COLORS[index % COLORS.length],
        icon: space?.icon ?? PICKABLE_ICONS[index % PICKABLE_ICONS.length],
      };

      const dialog = this.build(!!space, number, fallbackName, state);
      (document.body ?? document.documentElement).append(dialog);
      dialog.showModal();
      dialog.querySelector("#sunfinch-space-dialog-name").focus();

      await new Promise(resolve =>
        dialog.addEventListener("close", resolve, { once: true })
      );
      dialog.remove();
      if (dialog.returnValue != "ok") {
        return null;
      }
      return {
        name: state.name.trim() || fallbackName,
        color: state.color,
        icon: state.icon,
      };
    },

    build(editing, number, fallbackName, state) {
      const dialog = el("dialog", {
        id: DIALOG_ID,
        "aria-labelledby": "sunfinch-space-dialog-title",
      });

      // Preview of the switcher button.
      const previewIcon = el("img", { class: "sunfinch-space-icon", alt: "" });
      const previewName = el("span", { class: "sunfinch-space-name" });
      const preview = el("div", { class: "sunfinch-space-button", selected: "true" }, [
        previewIcon,
        el("span", { class: "sunfinch-space-number" }, [String(number).padStart(2, "0")]),
        previewName,
      ]);

      const colorButtons = COLOR_SWATCHES.map(color =>
        el("button", {
          type: "button",
          class: "sunfinch-space-dialog-color",
          "data-color": color,
          l10n: `sunfinch-space-color-${color}`,
        }, [el("span", { "aria-hidden": "true" })])
      );
      const iconButtons = PICKABLE_ICONS.map(icon =>
        el("button", {
          type: "button",
          class: "sunfinch-space-dialog-icon",
          "data-icon": icon,
          l10n: `sunfinch-space-icon-${icon}`,
        }, [el("img", { src: spaceIconURL(icon), alt: "" })])
      );

      const update = () => {
        for (const node of [dialog, preview]) {
          node.dataset.color = state.color;
        }
        for (const button of colorButtons) {
          button.setAttribute("aria-pressed", button.dataset.color == state.color);
        }
        for (const button of iconButtons) {
          button.setAttribute("aria-pressed", button.dataset.icon == state.icon);
        }
        previewIcon.src = spaceIconURL(state.icon);
        previewName.textContent = state.name.trim() || fallbackName;
      };
      for (const button of colorButtons) {
        button.addEventListener("click", () => {
          state.color = button.dataset.color;
          update();
        });
      }
      for (const button of iconButtons) {
        button.addEventListener("click", () => {
          state.icon = button.dataset.icon;
          update();
        });
      }

      const name = el("input", {
        type: "text",
        id: "sunfinch-space-dialog-name",
        maxlength: "60",
        placeholder: fallbackName,
      });
      name.value = state.name;
      name.addEventListener("input", () => {
        state.name = name.value;
        update();
      });

      const cancel = () => dialog.close("");
      const form = el("form", { method: "dialog" }, [
        el("header", {}, [
          el("h2", {
            id: "sunfinch-space-dialog-title",
            l10n: editing ? "sunfinch-space-dialog-edit-title" : "sunfinch-space-dialog-new-title",
          }),
          el("button", { type: "button", class: "sunfinch-space-dialog-close", l10n: "sunfinch-space-dialog-close" }),
        ]),
        el("div", { class: "sunfinch-space-dialog-body" }, [
          el("div", { class: "sunfinch-space-dialog-field" }, [
            el("label", { for: "sunfinch-space-dialog-name", l10n: "sunfinch-space-dialog-name" }),
            name,
            el("span", {
              class: "sunfinch-space-dialog-hint",
              l10n: ["sunfinch-space-dialog-name-hint", { name: fallbackName }],
            }),
          ]),
          el("fieldset", {}, [
            el("legend", { l10n: "sunfinch-space-dialog-color" }),
            el("div", { class: "sunfinch-space-dialog-colors" }, colorButtons),
          ]),
          el("fieldset", {}, [
            el("legend", { l10n: "sunfinch-space-dialog-icon" }),
            el("div", { class: "sunfinch-space-dialog-icons" }, iconButtons),
          ]),
          el("div", { class: "sunfinch-space-dialog-field" }, [
            el("span", { class: "sunfinch-space-dialog-label", l10n: "sunfinch-space-dialog-preview" }),
            el("div", { class: "sunfinch-space-dialog-preview" }, [preview]),
          ]),
        ]),
        el("footer", {}, [
          el("span", {
            class: "sunfinch-space-dialog-hint",
            l10n: editing ? "sunfinch-space-dialog-keys-edit" : "sunfinch-space-dialog-keys-new",
          }),
          el("button", { type: "button", class: "sunfinch-space-dialog-cancel", l10n: "sunfinch-space-dialog-cancel" }),
          el("button", {
            type: "submit",
            value: "ok",
            class: "sunfinch-space-dialog-ok",
            l10n: editing ? "sunfinch-space-dialog-save" : "sunfinch-space-dialog-create",
          }),
        ]),
      ]);
      form.querySelector(".sunfinch-space-dialog-close").addEventListener("click", cancel);
      form.querySelector(".sunfinch-space-dialog-cancel").addEventListener("click", cancel);
      // A click on the backdrop (outside the form) cancels, like Escape.
      dialog.addEventListener("click", event => {
        if (event.target == dialog) {
          cancel();
        }
      });
      dialog.append(form);
      update();
      return dialog;
    },
  };
}

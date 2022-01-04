// Copyright (c) Jupyter Development Team + FW.
// Distributed under the terms of the Modified BSD License.

import { CoreDOMWidgetModel } from '@jupyter-widgets/controls';
import { DOMWidgetView } from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

interface IFileUploaded {
  content: ArrayBuffer;
  name: string;
  size: number;
  type: string;
  last_modified: number;
}

// Import the CSS
import '../css/widget.css';

export class UploaderModel extends CoreDOMWidgetModel {
  defaults(): Backbone.ObjectHash {                                   // : Backbone.ObjectHash
    return {
      ...super.defaults(),
      _model_name: UploaderModel.model_name,
      _model_module: UploaderModel.model_module,
      _model_module_version: UploaderModel.model_module_version,

      _view_name: UploaderModel.view_name,
      _view_module: UploaderModel.view_module,
      _view_module_version: UploaderModel.view_module_version,

      // _model_name: 'UploaderModel',
      // _view_name: 'UploaderView',
      accept: '',
      description: 'Upload',
      disabled: false,
      icon: 'upload',
      button_style: '',
      multiple: false,
      value: [], // has type Array<IFileUploaded>
      error: '',
      style: null,
    };
  }

  static serializers = {
    ...CoreDOMWidgetModel.serializers,
    // use a dummy serializer for value to circumvent the default serializer.
    value: { serialize: <T>(x: T): T => x },
  };

  static model_name = 'UploaderModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'UploaderView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class UploaderView extends DOMWidgetView {
  // private _emailInput: HTMLInputElement;
  // render() {
  //   // this.el.classList.add('custom-widget');

  //   // this.value_changed();
  //   // this.model.on('change:value', this.value_changed, this);
    
  //   this._emailInput = document.createElement('input');
  //   this._emailInput.type = 'email';
  //   this._emailInput.value = this.model.get('value');
  //   this._emailInput.disabled = this.model.get('disabled');
  //   this.el.appendChild(this._emailInput);

  //   // this.el.classList.add('custom-widget');
  //   // this.value_changed();
  //   // this.model.on('change:value', this.value_changed, this);

  //   // py to js update
  //   this.model.on('change:value', this._onValueChanged, this);
  //   this.model.on('change:disabled', this._onDisabledChanged, this);

  //   // js to py update
  //   this._emailInput.onchange = this._onInputChanged.bind(this);
  // }

  // private _onValueChanged() {
  //   this._emailInput.value = this.model.get('value');
  // }

  // private _onDisabledChanged() {
  //   this._emailInput.disabled = this.model.get('disabled');
  // }

  // private _onInputChanged() {
  //   this.model.set('value', this._emailInput.value);
  //   this.model.save_changes();
  // }

  // // value_changed() {
  // //   this.el.textContent = this.model.get('value');
  // // }

  btn: HTMLButtonElement;
  fileInput: HTMLInputElement;

  progress: HTMLDivElement;
  bar: HTMLDivElement;

  preinitialize() {
    // Must set this before the initialize method creates the element
    this.tagName = 'button';
  }

  render(): void {
    super.render();

    this.btn = document.createElement('button');
    this.btn.classList.add('jupyter-widgets');
    this.btn.classList.add('widget-upload');
    this.btn.classList.add('jupyter-button');
    this.el.appendChild(this.btn);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    // this.fileInput.style.display = 'none';
    this.btn.appendChild(this.fileInput);

    this.progress = document.createElement('div');
    this.progress.classList.add('jupyter-widgets');
    this.progress.classList.add('widget-hprogress');
    this.progress.classList.add('progress');
    this.progress.style.position = 'relative';
    this.progress.style.display = 'none';
    this.el.appendChild(this.progress);

    this.bar = document.createElement('div');
    this.bar.classList.add('progress-bar');
    this.bar.style.position = 'absolute';
    this.bar.style.bottom = '0px';
    this.bar.style.left = '0px';
    this.bar.style.width = '0%';
    this.bar.style.height = '100%';
    this.progress.appendChild(this.bar);

    this.btn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('click', () => {
      this.fileInput.value = '';
    });

    this.fileInput.addEventListener('change', () => {
      const promisesFile: Array<Promise<IFileUploaded>> = [];

      // show progress bar
      this.progress.style.display = '';
      this.bar.style.width = '0%';

      Array.from(this.fileInput.files ?? []).forEach((file: File) => {
        promisesFile.push(
          new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = (): void => {
              // We know we can read the result as an array buffer since
              // we use the `.readAsArrayBuffer` method
              const content: ArrayBuffer = fileReader.result as ArrayBuffer;
              
              this.bar.style.width = '100%';
              console.log("Progress: 100");
              
              resolve({
                content,
                name: file.name,
                type: file.type,
                size: file.size,
                last_modified: file.lastModified,
              });
            };
            fileReader.onerror = (): void => {
              reject();
            };
            fileReader.onabort = fileReader.onerror;
            fileReader.onprogress = (event) => {
              if (event.loaded && event.total) {
                const percent = (event.loaded / event.total) * 100;
                this.bar.style.width = percent + '%';
                console.log(`Progress: ${Math.round(percent)}`);
              }
            }
            fileReader.readAsArrayBuffer(file);
          })
        );
      });

      Promise.all(promisesFile)
        .then((files: Array<IFileUploaded>) => {
          this.model.set({
            value: files,
            error: '',
          });
          this.touch();
        })
        .catch((err) => {
          console.error('error in file upload: %o', err);
          this.model.set({
            error: err,
          });
          this.touch();
        });
      
      // // hide progress bar
      // this.progress.style.display = 'none';

    });

    this.listenTo(this.model, 'change:button_style', this.update_button_style);
    this.set_button_style();
    this.update(); // Set defaults.
  }

  update(): void {
    this.btn.disabled = this.model.get('disabled');
    this.btn.setAttribute('title', this.model.get('tooltip'));

    const value: [] = this.model.get('value');
    const description = `${this.model.get('description')} (${value.length})`;
    const icon = this.model.get('icon');

    if (description.length || icon.length) {
      this.btn.textContent = '';
      if (icon.length) {
        const i = document.createElement('i');
        i.classList.add('fa');
        i.classList.add('fa-' + icon);
        if (description.length === 0) {
          i.classList.add('center');
        }
        this.btn.appendChild(i);
      }
      this.btn.appendChild(document.createTextNode(description));
    }

    this.fileInput.accept = this.model.get('accept');
    this.fileInput.multiple = this.model.get('multiple');

    return super.update();
  }

  update_button_style(): void {
    this.update_mapped_classes(
      UploaderView.class_map,
      'button_style',
      this.btn
    );
  }

  set_button_style(): void {
    this.set_mapped_classes(UploaderView.class_map, 'button_style', this.btn);
  }

  static class_map = {
    primary: ['mod-primary'],
    success: ['mod-success'],
    info: ['mod-info'],
    warning: ['mod-warning'],
    danger: ['mod-danger'],
  };
}
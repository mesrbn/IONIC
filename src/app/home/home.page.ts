import {Component} from '@angular/core';
import {HttpClient, HttpEventType} from '@angular/common/http';
import {FileOpener} from '@ionic-native/file-opener/ngx';
import {Storage} from '@capacitor/storage';
import {Directory, Filesystem} from '@capacitor/filesystem';
import write_blob from 'capacitor-blob-writer';
import {Capacitor} from '@capacitor/core';

const FILE_KEY = 'files';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  downloadUrl = '';
  myFiles = [];
  downloadProgress = 0;

  // https://file-examples.com/
  pdfUrl = 'https://file-examples-com.github.io/uploads/2017/10/file-example_PDF_1MB.pdf';
  videoUrl = 'https://file-examples-com.github.io/uploads/2017/04/file_example_MP4_480_1_5MG.mp4';
  imageUrl = 'https://file-examples-com.github.io/uploads/2017/10/file_example_JPG_2500kB.jpg';
  constructor(
    private http: HttpClient,
    private fileOpener: FileOpener
  ) {
    this.loadFiles();
  }

  async loadFiles() {
    const videoList = await Storage.get({key: FILE_KEY});
    this.myFiles = JSON.parse(videoList.value) || [];
  }
  // Helper functions
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    console.log('ready to convert');
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      console.log('converted to base64');
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
  private getMimetype(name) {
    if (name.indexOf('pdf') >= 0) {
      return 'application/pdf';
    } else if (name.indexOf('png') >= 0) {
      return 'image/png';
    } else if (name.indexOf('mp4') >= 0) {
      return 'video/mp4';
    }
  }

  private downloadFile(url) {
    this.downloadUrl = url ? url : this.downloadUrl;

    this.http.get(this.downloadUrl, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).subscribe(async (event) => {
      const t0 = performance.now();
      if (event.type === HttpEventType.DownloadProgress) {
        this.downloadProgress = Math.round((100*event.loaded)/event.total);
      } else if (event.type === HttpEventType.Response) {
        this.downloadProgress = 0;

        const name = this.downloadUrl.substr(this.downloadUrl.lastIndexOf('/') + 1);
        // const base64 = await this.convertBlobToBase64(event.body) as string;
        // const savedFile = await Filesystem.writeFile({
        //   path: name,
        //   data: base64,
        //   directory: Directory.Documents,
        // });
        const savedFile = write_blob({
          path: name,
          directory: Directory.Documents,
          blob: event.body,
          recursive: true,
          // eslint-disable-next-line @typescript-eslint/no-shadow,@typescript-eslint/naming-convention,prefer-arrow/prefer-arrow-functions
          on_fallback(error) {
            console.error('cannot save the file ', error);
          }
        })
          .then(myVideoUri => {
          console.log('append child is started!');
          console.log(myVideoUri);
          const videoElement = document.createElement('video');
          videoElement.src = Capacitor.convertFileSrc(myVideoUri);
          document.body.appendChild(videoElement);
          console.log('append file is finished!');
            const path = myVideoUri;
            const mimeType = this.getMimetype(name);
            console.log('saved: ', savedFile);
            console.log('path: ', path);
            this.fileOpener.open(path, mimeType)
              .then(()=>console.log('FIle is opened'))
              .catch(err => console.log('Error opening file', err));
            this.myFiles.unshift(path);
            Storage.set({
              key: FILE_KEY,
              value: JSON.stringify(this.myFiles)
            });
        })
          .catch(e=>console.log('writing the file was unsuccessful with error message : ', e));
        console.log(`downloading and saving the file took: ${(performance.now()-t0)/1000} seconds`);
        // const path = savedFile.uri;
        // const mimeType = this.getMimetype(name);
        // console.log('saved: ', savedFile);
        // console.log('path: ', path);
        // this.fileOpener.open(path, mimeType)
        //   .then(()=>console.log('FIle is opened'))
        //   .catch(err => console.log('Error opening file', err));
        // this.myFiles.unshift(path);
        // Storage.set({
        //   key: FILE_KEY,
        //   value: JSON.stringify(this.myFiles)
        // });
      }
    });
  }
  private deleteFile(path) {
    const t0 = performance.now();
    const name = path.substr(path.lastIndexOf('/') + 1);
    Filesystem.deleteFile({
      path:name,
      directory: Directory.Documents
    })
      .then(()=> {
        console.log(`deleting file took: ${(performance.now() - t0) / 1000} seconds`);
      });
    this.myFiles=this.myFiles.filter(filePath => filePath !== path);
    Storage.set({
      key: FILE_KEY,
      value: JSON.stringify(this.myFiles)
    });
  }
  private async openFile(f) {
    const t0 = performance.now();
    const name = f.substr(f.lastIndexOf('/') + 1);
    const mimeType = this.getMimetype(name);
    this.fileOpener.showOpenWithDialog(f, mimeType)
      .then(()=> {
        const t1 = performance.now();
        console.log('File is opened');
        console.log(`Opening a file took: ${(t1-t0)/1000} seconds`);
      })
      .catch(e=>console.log('Error opening file', e));
  }
}

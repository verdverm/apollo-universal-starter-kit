import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import path from 'path';
import { DocumentPicker, MediaLibrary, Constants, FileSystem, Permissions } from 'expo';
import { ReactNativeFile } from 'apollo-upload-client';
import * as mime from 'react-native-mime-types';
import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { Modal } from '@module/look-client-react-native';
import url from 'url';

import uploadConfig from '../../../../config/upload';

const {
  manifest: { bundleUrl }
} = Constants;
const { protocol, host, hostname, port } = url.parse(__API_URL__);
const serverUrl = `${protocol}//${
  hostname === 'localhost' ? url.parse(bundleUrl).hostname + (port ? ':' + port : '') : host
}`;

export default class UploadView extends React.Component {
  static propTypes = {
    t: PropTypes.func,
    handleUploadFiles: PropTypes.func,
    files: PropTypes.array,
    handleRemoveFile: PropTypes.func
  };

  state = {
    notify: null
  };

  uploadFile = async () => {
    const { handleUploadFiles, t } = this.props;
    const { uri, name, type: pickerType } = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });

    if (pickerType === 'cancel') {
      return;
    }

    const type = mime.contentType(path.extname(name));
    if (type) {
      const imageData = new ReactNativeFile({ uri, name, type });
      await handleUploadFiles([imageData]);
    } else {
      this.setState({ notify: t('upload.errorMsg') });
    }
  };

  downloadFile = async (path, name) => {
    const { t } = this.props;
    const { albumName } = uploadConfig;
    if (await this.checkPermission(Permissions.CAMERA_ROLL)) {
      try {
        const { uri } = await FileSystem.downloadAsync(serverUrl + '/' + path, FileSystem.cacheDirectory + name);
        const createAsset = await MediaLibrary.createAssetAsync(uri);

        // Remove file from cache directory
        await FileSystem.deleteAsync(uri);

        const album = await MediaLibrary.getAlbumAsync(albumName);
        album
          ? await MediaLibrary.addAssetsToAlbumAsync([createAsset], album, false)
          : await MediaLibrary.createAlbumAsync(albumName, createAsset, false);
        this.setState({ notify: `${t('download.successMsg')} ${albumName}` });
      } catch (e) {
        this.setState({ notify: `${e}` });
      }
    } else {
      this.setState({ notify: t('download.errorMsg') });
    }
  };

  checkPermission = async type => {
    const { getAsync, askAsync } = Permissions;
    const { status } = await getAsync(type);
    if (status !== 'granted') {
      const { status } = await askAsync(type);
      return status === 'granted';
    }
    return true;
  };

  renderFileInfo = ({ item: { id, name, path } }) => {
    const { handleRemoveFile } = this.props;
    return (
      <TouchableOpacity style={styles.fileWrapper} onPress={() => this.downloadFile(path, name)}>
        <Text style={styles.text}>{name}</Text>
        <TouchableOpacity style={styles.iconWrapper} onPress={() => handleRemoveFile(id)}>
          <FontAwesome name="trash" size={20} style={{ color: '#3B5998' }} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  renderModal = () => (
    <Modal isVisible={!!this.state.notify} onBackdropPress={() => this.setState({ notify: null })}>
      <View style={styles.alertTextWrapper}>
        <Text>{this.state.notify}</Text>
      </View>
    </Modal>
  );

  render() {
    const { files, t } = this.props;
    return files ? (
      <Fragment>
        {this.renderModal()}
        <View style={styles.container}>
          <View style={styles.btnContainer}>
            <TouchableOpacity style={styles.btn} onPress={this.uploadFile}>
              <Text style={styles.btnText}>{t('upload.btn')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={files}
            style={styles.list}
            keyExtractor={item => `${item.id}`}
            renderItem={this.renderFileInfo}
          />
        </View>
      </Fragment>
    ) : null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  btnContainer: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  btn: {
    width: 200,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0275d8',
    borderRadius: 10
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  text: {
    fontSize: 18
  },
  iconWrapper: {
    backgroundColor: 'transparent',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row'
  },
  fileWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#000',
    borderBottomWidth: 0.8,
    height: 50,
    paddingLeft: 7
  },
  list: {
    marginTop: 5,
    width: '100%'
  },
  alertTextWrapper: {
    backgroundColor: '#fff',
    padding: 10
  }
});

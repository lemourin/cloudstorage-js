import * as React from "react";
import { CloudAccess, CloudItem } from "../cloudstorage";
import * as VideoStream from "videostream";

interface ViewItemProps {
    access: CloudAccess
    path: string
    location: any
    match: any
}

interface ViewItemState {
    currentItem: CloudItem | undefined,
    scheduledUpdate: boolean,
    pending: boolean
}

export default class ViewItem extends React.Component<ViewItemProps, ViewItemState> {
    constructor(props: ViewItemProps) {
        super(props);
        this.state = {
            currentItem: undefined,
            pending: false,
            scheduledUpdate: false,
        }
    }

    locationItem = () => {
        if (this.props.location.state && this.props.location.state.item)
            return this.props.location.state.item;
        return undefined;
    }

    initializeStream(item: CloudItem) {
        console.log(VideoStream);
        const access = this.props.access;
        const stream = new VideoStream({
            createReadStream(opts: any) {
                const { start, end } = opts;
                const stream = access.downloadFile(item, start, end);
                console.log(stream);
                return stream;
            }
        }, document.getElementById("video"));
    }

    componentDidMount() {
        this.componentDidUpdate(this.props);
    }

    async componentDidUpdate(prevProps: ViewItemProps) {
        if (this.state.scheduledUpdate) {
            if (!this.state.pending) {
                if (this.locationItem()) {
                    this.setState({ currentItem: this.locationItem(), scheduledUpdate: false });
                    this.initializeStream(this.locationItem());
                } else {
                    this.setState({ pending: true, scheduledUpdate: false });
                    const currentItem = await this.props.access.getItem(this.props.path);
                    const previousItem = this.state.currentItem;
                    this.initializeStream(currentItem);
                    this.setState({ currentItem, scheduledUpdate: false, pending: false }, () => {
                        if (previousItem) previousItem.destroy();
                    });
                }
            }
        } else if (this.locationItem() && this.locationItem() != this.state.currentItem) {
            this.setState({ scheduledUpdate: true });
        } else if (!this.state.currentItem || prevProps.access != this.props.access || prevProps.path != this.props.path) {
            this.setState({ scheduledUpdate: true });
        }
    }

    componentWillUnmount() {
        if (this.state.currentItem) {
            const item = this.state.currentItem;
            this.setState({ currentItem: undefined, scheduledUpdate: true }, () => {
                item.destroy();
            });
        }
    }

    render() {
        return <div>
            Video preview
            <video id="video"></video>
        </div>
    }
}
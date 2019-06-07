import * as React from "react";
import { CloudAccess, CloudItem } from "js/cloudstorage";
import { Link } from "react-router-dom";
import { List, ListItem } from "react-toolbox/lib/list";

interface ListViewProps {
    access: CloudAccess
    path: string
    location: any
}

interface ListViewState {
    currentRoot: CloudItem | undefined
    items: CloudItem[],
    pending: boolean,
    scheduledUpdate: boolean
}

export default class ListView extends React.Component<ListViewProps, ListViewState> {
    constructor(props: ListViewProps) {
        super(props);
        this.state = {
            currentRoot: undefined,
            items: [],
            pending: false,
            scheduledUpdate: false,
        }
    }

    clear() {
        const array = this.state.items.slice();
        this.setState({ items: [] }, () => {
            for (const d of array) {
                d.destroy();
            }
        });
    }

    componentDidMount() {
        this.clear();
    }

    async updateList(root: CloudItem) {
        try {
            this.setState({ pending: true });
            this.clear();
            let token = "";
            const items: CloudItem[] = [];
            while (true) {
                const list = await this.props.access.listDirectoryPage(root, token);
                if (this.state.scheduledUpdate) {
                    break;
                }
                for (const d of list.items)
                    items.push(d);
                this.setState({ items });
                if (list.nextToken === "")
                    break;
                token = list.nextToken;
            }
        } catch (e) {
        } finally {
            this.setState({ pending: false });
        }
    }

    locationRoot = () => {
        if (this.props.location.state && this.props.location.state.root)
            return this.props.location.state.root;
        return undefined;
    }

    async componentDidUpdate(prevProps: ListViewProps) {
        if (this.state.scheduledUpdate) {
            if (!this.state.pending) {
                if (this.locationRoot()) {
                    this.setState({ currentRoot: this.locationRoot(), scheduledUpdate: false });
                    await this.updateList(this.locationRoot());
                } else {
                    try {
                        const currentRoot = await this.props.access.getItem(this.props.path);
                        const previousRoot = this.state.currentRoot;
                        this.setState({ currentRoot, scheduledUpdate: false }, () => {
                            if (previousRoot) previousRoot.destroy();
                        });
                        await this.updateList(currentRoot);
                        console.log(await this.props.access.downloadFileChunk(currentRoot));
                    } catch (e) {
                        console.log("error", e);
                    }
                }
            }
        } else if (this.locationRoot() && this.locationRoot() != this.state.currentRoot) {
            this.setState({ scheduledUpdate: true });
        } else if (!this.state.currentRoot || prevProps.access != this.props.access || prevProps.path != this.props.path) {
            this.setState({ scheduledUpdate: true });
        }
    }

    componentWillUnmount() {
        if (this.state.currentRoot) {
            const root = this.state.currentRoot;
            this.setState({ currentRoot: undefined, scheduledUpdate: true }, () => {
                root.destroy();
            });
        }
        this.clear();
    }

    render() {
        return <div>
            Listing view {this.props.path}
            <List>
                {
                    this.state.items.map((value: CloudItem) => {
                        return <Link key={value.id()} to={{
                            pathname: `${encodeURIComponent(value.filename())}/`,
                            state: {
                                root: value.copy()
                            }
                        }}>
                            <ListItem caption={value.filename()} />
                        </Link>;
                    })
                }
            </List>
        </div>
    }
};